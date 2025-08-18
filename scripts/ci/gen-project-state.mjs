#!/usr/bin/env node
/*
 Generates ./state/project-state.json and ./state/badge.json
 – Robust to missing env/secrets and network hiccups
 – Never throws; always writes a state snapshot
*/

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const nowIso = new Date().toISOString();

function env(name, fallback = '') {
  return process.env[name] ?? fallback;
}

function parseRepo(urlEnv) {
  // Prefer GITHUB_REPOSITORY (owner/repo). Fallback to parsing remote URL
  const rr = env('GITHUB_REPOSITORY');
  if (rr && rr.includes('/')) return rr;
  try {
    const url = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    // https://github.com/<owner>/<repo>.git
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i);
    if (m) return `${m[1]}/${m[2]}`;
  } catch {}
  return 'unknown/unknown';
}

const repository = parseRepo(process.env.GITHUB_REPOSITORY);
const [owner, repo] = repository.split('/');
const sha = env('GITHUB_SHA', safeExec('git rev-parse HEAD'));
const branch = env('GITHUB_REF_NAME', safeExec('git rev-parse --abbrev-ref HEAD'));
const runId = env('GITHUB_RUN_ID', '');

function safeExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf-8' }).trim(); } catch { return ''; }
}

async function gh(path) {
  const token = env('GITHUB_TOKEN');
  const headers = { 'Accept': 'application/vnd.github+json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = `https://api.github.com${path}`;
  try {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`GH ${r.status}`);
    return await r.json();
  } catch (e) {
    return { __error: String(e) };
  }
}

async function searchIssues(q) {
  const data = await gh(`/search/issues?q=${encodeURIComponent(q)}`);
  return typeof data?.total_count === 'number' ? data.total_count : -1;
}

async function getCommit(sha) {
  const data = await gh(`/repos/${owner}/${repo}/commits/${sha}`);
  const commit = data?.commit || {};
  return {
    sha,
    message: commit?.message || safeExec(`git log -1 --pretty=%s ${sha}`) || '',
    author: commit?.author?.name || data?.author?.login || '',
    timestamp: commit?.author?.date || nowIso
  };
}

function detectChanges() {
  let base = safeExec('git rev-list --merges -n 1 HEAD');
  if (!base) base = safeExec('git rev-parse HEAD~1');
  const diffList = base ? safeExec(`git diff --name-only ${base}..HEAD`) : '';
  const files = diffList ? diffList.split('\n').filter(Boolean) : [];
  const changes = { apps_web: false, packages_api: false, scripts: false, docs: false };
  for (const f of files) {
    if (f.startsWith('apps/web/')) changes.apps_web = true;
    if (f.startsWith('packages/api/')) changes.packages_api = true;
    if (f.startsWith('scripts/')) changes.scripts = true;
    if (f.startsWith('docs/') || /(^|\/)README\.md$/i.test(f)) changes.docs = true;
  }
  return changes;
}

async function getLatestTag() {
  const data = await gh(`/repos/${owner}/${repo}/tags?per_page=50`);
  const list = Array.isArray(data) ? data.map(x => x?.name).filter(Boolean) : [];
  const semver = list.find((t) => /^(v?\d+\.\d+\.\d+)([-+].*)?$/.test(t));
  return semver || null;
}

async function getDataVersion() {
  const base = env('STAGING_META_URL', '');
  if (!base) return null;
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(`${base.replace(/\/$/, '')}/api/meta/version`, { signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    let body = null;
    const text = await r.text();
    try {
      body = JSON.parse(text);
    } catch {
      // if top-level is raw string, accept as version
      if (text && /^\s*"?.+"?\s*$/.test(text)) return text.replace(/^\s*"|"\s*$/g, '').trim();
    }
    if (body && typeof body === 'object') {
      if (typeof body.version === 'string') return body.version;
      if (typeof body.dataVersion === 'string') return body.dataVersion;
    }
    return null;
  } catch {
    clearTimeout(to);
    return null;
  }
}

async function main() {
  // Helper: fetch with timeout
  async function fetchWithTimeout(url, opts = {}, timeoutMs = 6000) {
    const ctl = new AbortController();
    const id = setTimeout(() => ctl.abort(), timeoutMs);
    try { return await fetch(url, { ...opts, signal: ctl.signal }); }
    finally { clearTimeout(id); }
  }

  // Validate a candidate preview URL
  async function validatePreview(url) {
    if (!url) return { ok: false, root: 0, health: 0 };
    const base = url.replace(/\/$/, '');
    let root = 0, health = 0;
    try { const r = await fetchWithTimeout(`${base}/`, {}, 5000); root = r.status; } catch {}
    try { const r = await fetchWithTimeout(`${base}/api/health`, {}, 5000); health = r.status; } catch {}
    const ok = ((root === 200 || root === 401) && health === 200);
    return { ok, root, health };
  }

  // Resolve preview URL (Vercel API → candidates → CHANGESUMMARY)
  async function resolvePreviewUrl() {
    // a) Vercel API
    try {
      const token = env('VERCEL_TOKEN', '');
      const app = env('VERCEL_APP', 'eucorail-fleetops-demo-web');
      if (token && app) {
        const r = await fetch(`https://api.vercel.com/v6/deployments?app=${encodeURIComponent(app)}&limit=1`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (r.ok) {
          const j = await r.json();
          const d = Array.isArray(j?.deployments) ? j.deployments[0] : (j?.deployments || [])[0];
          const url = d?.url ? `https://${d.url}` : '';
          if (url) {
            const v = await validatePreview(url);
            if (v.ok) return { url, root: v.root, health: v.health };
          }
        }
      }
    } catch {}
    // b) Known candidates
    const candidates = [
      'https://eucorail-fleetops-demo.vercel.app',
      'https://eucorail-fleetops-demo-christianschmeing.vercel.app',
      'https://eucorail-fleetops.vercel.app',
      'https://christianschmeing-eucorail-fleetops-demo.vercel.app',
      'https://eucorail-fleetops-demo-web.vercel.app'
    ];
    for (const u of candidates) {
      const v = await validatePreview(u);
      if (v.ok) return { url: u, root: v.root, health: v.health };
    }
    // c) Fallback to CHANGESUMMARY
    try {
      const txt = readFileSync('CHANGESUMMARY.md', 'utf-8');
      const m = txt.match(/Preview Web:\s*(https?:\/\/[^\s]+)\s*\(status=(\d+)\)/);
      if (m) {
        const u = m[1];
        const v = await validatePreview(u);
        if (v.ok) return { url: u, root: v.root, health: v.health };
      }
    } catch {}
    return { url: '', root: 0, health: 0 };
  }

  const commit = await getCommit(sha);
  const [p0, p1, allIssues, prs, latestTag, dataVersion] = await Promise.all([
    searchIssues(`repo:${owner}/${repo} is:issue is:open label:P0`),
    searchIssues(`repo:${owner}/${repo} is:issue is:open label:P1`),
    searchIssues(`repo:${owner}/${repo} is:issue is:open`),
    searchIssues(`repo:${owner}/${repo} is:pr is:open`),
    getLatestTag(),
    getDataVersion()
  ]);

  let ciStatus = (env('CI_STATUS') || '').toLowerCase();
  let status = ciStatus === 'success' || ciStatus === 'failed' || ciStatus === 'skipped' ? ciStatus : 'success';

  const state = {
    repo: `/${owner}/${repo}`,
    branch,
    commit,
    ci: { status, workflow: 'state', run_id: runId },
    changes: detectChanges(),
    issues: { p0_open: p0, p1_open: p1, all_open: allIssues },
    prs: { open: prs },
    data_version: dataVersion,
    release: { latest_tag: latestTag },
    generated_at: nowIso,
    default_branch_hint: 'main',
    preview: undefined
  };

  // Attempt to resolve a valid public preview URL
  let previewResolved = await resolvePreviewUrl();
  if (previewResolved.url) {
    const auth = process.env.PREVIEW_ENABLE_AUTH === '1' ? 'basic' : null;
    state.preview = { web: previewResolved.url, api: null, auth };
  }

  // Agent onboarding links (tolerant)
  try {
    const base = 'https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/gh-pages';
    // Prefer gh-pages raw URLs for stability; fallback to repo paths
    const rulesRaw = 'https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/main/docs/AGENT_SYSTEM_RULES.md';
    const seedRaw = 'https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/main/.agent/SEED.prompt';
    (state).agent_rules_url = rulesRaw;
    (state).agent_seed_url = seedRaw;
  } catch {}

  mkdirSync('state', { recursive: true });
  writeFileSync('state/project-state.json', JSON.stringify(state, null, 2));
  // Write a small redirecting index.html to make a stable preview link
  try {
    const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>State Preview Redirect</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;background:#0b1f2a;color:#fff;padding:2rem}a{color:#7cc}</style></head><body><h1>Preview</h1><div id="out">Loading state…</div><script>(async()=>{const out=document.getElementById('out');try{const r=await fetch('./project-state.json?t='+Date.now(),{cache:'no-store'});if(!r.ok){out.textContent='Failed to load project-state.json ('+r.status+')';return;}const j=await r.json();const url=(j&&j.preview&&j.preview.web)||'';const auth=(j&&j.preview&&j.preview.auth)||null;if(url){out.innerHTML='Redirecting to preview… <a href="'+url+'">'+url+'</a>'+(auth==='basic'?' (Basic-Auth required)':'');location.replace(url);}else{out.innerHTML='Preview not available yet. See <a href="./project-state.json">project-state.json</a>.'}}catch(e){out.textContent='Preview not available yet.';}})();</script></body></html>`;
    writeFileSync('state/index.html', html);
  } catch {}

  const short = commit.sha?.slice(0, 7) || '';
  const symbol = status === 'success' ? '✓' : (status === 'skipped' ? '•' : '✗');
  const color = status === 'success' ? 'brightgreen' : (status === 'skipped' ? 'orange' : 'red');
  const branchLabel = branch === 'main' ? 'main' : branch;
  const badge = { schemaVersion: 1, label: 'state', message: `${branchLabel}@${short} ${symbol}`.trim(), color };
  writeFileSync('state/badge.json', JSON.stringify(badge, null, 2));

  console.log('State generated at ./state');

  try {
    if (previewResolved.url) {
      writeFileSync('CHANGESUMMARY.md', `\nPreview Web: ${previewResolved.url} (status=${previewResolved.root || 200})\n`, { flag: 'a' });
    } else {
      writeFileSync('CHANGESUMMARY.md', `\n[SKIPPED:preview-missing] No valid preview resolved\n`, { flag: 'a' });
    }
  } catch {}
}

await main().catch((e) => {
  try { mkdirSync('state', { recursive: true }); } catch {}
  const fallback = {
    repo: `/${owner}/${repo}`,
    branch,
    commit: { sha, message: '', author: '', timestamp: nowIso },
    ci: { status: 'skipped', workflow: 'state', run_id: runId },
    changes: detectChanges(),
    issues: { p0_open: -1, p1_open: -1, all_open: -1 },
    prs: { open: -1 },
    data_version: null,
    release: { latest_tag: null },
    generated_at: nowIso
  };
  writeFileSync('state/project-state.json', JSON.stringify(fallback, null, 2));
  try { writeFileSync('state/index.html', '<!doctype html><html><body><p>Preview not available yet. See <a href="./project-state.json">project-state.json</a>.</p></body></html>'); } catch {}
  const badge = { schemaVersion: 1, label: 'state', message: `${branch}@${sha.slice(0,7)} •`, color: 'orange' };
  writeFileSync('state/badge.json', JSON.stringify(badge, null, 2));
  console.error('State generation failed softly:', e?.message || String(e));
});


