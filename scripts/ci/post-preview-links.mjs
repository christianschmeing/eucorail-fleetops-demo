#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function env(name, fallback=''){ return process.env[name] ?? fallback; }

function parseRepo(){
  let rr = env('GITHUB_REPOSITORY','');
  if(!rr){
    try{ const url = execSync('git remote get-url origin',{encoding:'utf-8'}).trim(); const m=url.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i); if(m) rr=`${m[1]}/${m[2]}`; }catch{}
  }
  const [owner, repo] = (rr||'unknown/unknown').split('/');
  const ref = env('GITHUB_REF_NAME', '');
  return { owner, repo, ref };
}

async function gh(path, {method='GET', body}={}){
  const token = env('GITHUB_TOKEN','');
  const headers = { 'Accept':'application/vnd.github+json' };
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const url = `https://api.github.com${path}`;
  const r = await fetch(url, { method, headers, body: body?JSON.stringify(body):undefined });
  if(!r.ok) throw new Error(`GitHub ${method} ${path} -> ${r.status}`);
  return r.json();
}

function extract(lines, prefix){
  const ln = lines.find(l=>l.startsWith(prefix));
  return ln ? ln.slice(prefix.length).trim() : '';
}

function pickP95(summary){
  const lookup = (label) => {
    const re = new RegExp(`\\|\\s${label.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\s\\|`,'i');
    const line = summary.split(/\r?\n/).find(l => re.test(l));
    if(!line) return null;
    const cells = line.split('|').map(s=>s.trim());
    return cells[3] || null; // p95 column
  };
  return {
    health: lookup('/api/health'),
    trains: lookup('/api/trains?limit=1'),
    lines: lookup('/api/lines'),
    depots: lookup('/api/depots'),
    kpi: lookup('/api/metrics/kpi'),
    expLines: lookup('export lines'),
    expTrains: lookup('export trains')
  };
}

async function main(){
  const { owner, repo, ref } = parseRepo();
  // find PR for this branch
  let prNumber = null;
  try{
    const prs = await gh(`/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${encodeURIComponent(ref)}`);
    if(Array.isArray(prs) && prs.length) prNumber = prs[0].number;
  }catch{}
  if(!prNumber){ process.exit(0); }

  let summary='';
  try{ summary = readFileSync('CHANGESUMMARY.md','utf-8'); }catch{}
  const lines = summary.split(/\r?\n/);
  const preview = extract(lines, 'Preview Web:');
  const pagesUrl = extract(lines, 'Pages URL:');
  const p95 = pickP95(summary);

  const md = [];
  if(preview) md.push(`✅ Preview: ${preview}`);
  if(pagesUrl) md.push(`🌐 Pages: ${pagesUrl} (stable /state/)`);
  md.push(`p95: health=${p95.health ?? '-'} | trains=${p95.trains ?? '-'} | lines=${p95.lines ?? '-'} | depots=${p95.depots ?? '-'} | kpi=${p95.kpi ?? '-'} | exports=${p95.expLines ?? '-'}/${p95.expTrains ?? '-'}`);
  md.push(`Docs: VC_READINESS.md, VC_DEMO_SCRIPT.md`);
  const body = md.join('\n');
  try{
    await gh(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, { method:'POST', body:{ body } });
  }catch{}
}

await main().catch(()=>process.exit(0));




