#!/usr/bin/env node
/*
 Generates ./state/project-state.json and ./state/badge.json
 – Robust to missing env/secrets and network hiccups
 – Never throws; always writes a state snapshot
*/

import { mkdirSync, writeFileSync } from 'node:fs';
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
  const to = setTimeout(() => ctl.abort(), 3000);
  try {
    const r = await fetch(`${base.replace(/\/$/, '')}/api/meta/version`, { signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    const txt = (await r.text()).trim();
    return txt || null;
  } catch {
    clearTimeout(to);
    return null;
  }
}

async function main() {
  const commit = await getCommit(sha);
  const [p0, p1, allIssues, prs, latestTag, dataVersion] = await Promise.all([
    searchIssues(`repo:${owner}/${repo} is:issue is:open label:P0`),
    searchIssues(`repo:${owner}/${repo} is:issue is:open label:P1`),
    searchIssues(`repo:${owner}/${repo} is:issue is:open`),
    searchIssues(`repo:${owner}/${repo} is:pr is:open`),
    getLatestTag(),
    getDataVersion()
  ]);

  const ciStatus = (env('CI_STATUS') || '').toLowerCase();
  const status = ciStatus === 'success' || ciStatus === 'failed' || ciStatus === 'skipped' ? ciStatus : 'success';

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
    generated_at: nowIso
  };

  mkdirSync('state', { recursive: true });
  writeFileSync('state/project-state.json', JSON.stringify(state, null, 2));

  const short = commit.sha?.slice(0, 7) || '';
  const symbol = status === 'success' ? '✓' : (status === 'skipped' ? '•' : '✗');
  const color = status === 'success' ? 'brightgreen' : (status === 'skipped' ? 'orange' : 'red');
  const badge = { schemaVersion: 1, label: 'state', message: `${branch}@${short} ${symbol}`.trim(), color };
  writeFileSync('state/badge.json', JSON.stringify(badge, null, 2));

  console.log('State generated at ./state');
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
  const badge = { schemaVersion: 1, label: 'state', message: `${branch}@${sha.slice(0,7)} •`, color: 'orange' };
  writeFileSync('state/badge.json', JSON.stringify(badge, null, 2));
  console.error('State generation failed softly:', e?.message || String(e));
});


