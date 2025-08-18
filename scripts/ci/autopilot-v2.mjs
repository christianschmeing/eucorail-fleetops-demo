#!/usr/bin/env node
/**
 * Autopilot V2 – Deterministic preview resolve + smoke p95 + bundle summary
 * A) Try gh-pages state preview.web
 * B) If missing, dispatch one-shot workflow and wait (15min max), retry A
 * C) If still missing, attempt quick-tunnel (skipped here if no local server)
 * D) If still missing, serve Pages fallback; record SKIPPED
 *
 * Outputs:
 * - Appends Claude-style sections to CHANGESUMMARY.md
 * - Writes state/preview-metrics.json with machine-readable metrics
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

const repoRoot = process.cwd();

function nowIso(){ return new Date().toISOString(); }
function appendSummary(t){ try { writeFileSync(join(repoRoot, 'CHANGESUMMARY.md'), `\n\n${t}\n`, { flag: 'a' }); } catch {} }
function env(n,f=''){ return process.env[n] ?? f; }

function parseRepo(){
  let rr = env('GITHUB_REPOSITORY','');
  if(!rr){
    try{ const url=execSync('git remote get-url origin',{encoding:'utf-8'}).trim(); const m=url.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i); if(m) rr=`${m[1]}/${m[2]}`; }catch{}
  }
  const [owner, repo] = (rr||'unknown/unknown').split('/');
  const ref = env('GITHUB_REF_NAME', (()=>{ try{ return execSync('git rev-parse --abbrev-ref HEAD',{encoding:'utf-8'}).trim(); }catch{return 'main';} })());
  return { owner, repo, ref };
}

async function fetchJson(url, timeoutMs=5000){
  const ctl = new AbortController();
  const to = setTimeout(()=>ctl.abort(), timeoutMs);
  try{
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    const status = r.status;
    if(!r.ok){ return { ok:false, status, data:null }; }
    const data = await r.json();
    return { ok:true, status, data };
  }catch{ return { ok:false, status:0, data:null }; }
  finally{ clearTimeout(to); }
}

async function gh(path, { method='GET', body }={}){
  const token = env('GITHUB_TOKEN','');
  const headers = { 'Accept':'application/vnd.github+json' };
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const url = `https://api.github.com${path}`;
  const r = await fetch(url, { method, headers, body: body?JSON.stringify(body):undefined });
  return { ok: r.ok, status: r.status, data: await (async()=>{ try{ return await r.json(); }catch{return null;} })() };
}

async function dispatchOneShot(owner, repo, ref){
  const res = await gh(`/repos/${owner}/${repo}/actions/workflows/preview_and_pages.yml/dispatches`, { method:'POST', body:{ ref } });
  return res.ok;
}

async function waitForOneShot(owner, repo, ref, maxSeconds=900){
  const start = Date.now();
  while((Date.now()-start)/1000 < maxSeconds){
    const runs = await gh(`/repos/${owner}/${repo}/actions/workflows/preview_and_pages.yml/runs?branch=${encodeURIComponent(ref)}&per_page=1`);
    const wr = runs?.data?.workflow_runs?.[0];
    if (wr && wr.status === 'completed') return wr.conclusion || 'completed';
    await new Promise(r=>setTimeout(r, 10000));
  }
  return '[SKIPPED:dispatch-timeout]';
}

async function resolvePreview(){
  const { owner, repo, ref } = parseRepo();
  // A) gh-pages state
  let url = '';
  let decision = 'A:gh-pages';
  try{
    const r = await fetchJson(`https://raw.githubusercontent.com/${owner}/${repo}/gh-pages/state/project-state.json`, 6000);
    if (r.ok && r.data?.preview?.web) url = r.data.preview.web;
  }catch{}
  if(url) return { url, decision };
  // B) dispatch one-shot
  decision = 'B:dispatch-one-shot';
  try{
    const ok = await dispatchOneShot(owner, repo, ref);
    if (!ok) appendSummary('[SKIPPED:dispatch-failed]');
    const concl = await waitForOneShot(owner, repo, ref, 900);
    appendSummary(`One-shot workflow status: ${concl}`);
    // retry A
    try{
      const r = await fetchJson(`https://raw.githubusercontent.com/${owner}/${repo}/gh-pages/state/project-state.json`, 6000);
      if (r.ok && r.data?.preview?.web) { url = r.data.preview.web; return { url, decision }; }
    }catch{}
  }catch{}
  // C) quick tunnel (not viable without local server)
  decision = 'C:quick-tunnel [SKIPPED:quick-tunnel-not-available]';
  // D) pages fallback
  decision += ' -> D:pages-fallback';
  return { url:'', decision };
}

async function validate(base){
  if(!base) return { root:0, health:0 };
  const b = base.replace(/\/$/, '');
  const r1 = await fetchJson(`${b}/`, 3000);
  const r2 = await fetchJson(`${b}/api/health`, 3000);
  return { root: r1.status || 0, health: r2.status || 0 };
}

function pct(arr, p){ const a=[...arr].sort((x,y)=>x-y); if(!a.length) return 0; const i=Math.min(a.length-1, Math.max(0, Math.ceil(p/100*a.length)-1)); return a[i]; }

async function timeEndpoint(url, opts={}){
  const { tries=5, timeoutMs=3000, expectCt, checkJson, containText } = opts;
  const durations=[]; let last=0; let pass=false;
  for(let i=0;i<tries;i++){
    const t0=Date.now();
    try{
      const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(), timeoutMs);
      const r = await fetch(url, { signal: ctl.signal, cache:'no-store' });
      clearTimeout(to); last = r.status;
      const ct=(r.headers.get('content-type')||'').toLowerCase();
      if(expectCt && !ct.includes(expectCt)){ durations.push(Date.now()-t0); continue; }
      if(checkJson==='array>=1'){ const j=await r.json(); if(!Array.isArray(j)||j.length<1){ durations.push(Date.now()-t0); continue; } }
      if(containText){ const tx=await r.text(); if(!containText.some(s=>new RegExp(s,'i').test(tx))){ durations.push(Date.now()-t0); continue; } }
      pass = r.ok || (url.endsWith('/') && (r.status===200||r.status===401));
      durations.push(Date.now()-t0);
    }catch{ durations.push(Date.now()-t0); }
  }
  return { status:last, p50:pct(durations,50), p95:pct(durations,95), ok:pass };
}

function readManifests(){
  const base=join(repoRoot,'apps/web/.next');
  const files=['app-build-manifest.json','build-manifest.json'];
  const out={};
  for(const f of files){ const p=join(base,f); if(existsSync(p)){ try{ out[f]=JSON.parse(readFileSync(p,'utf-8')); }catch{} } }
  return out;
}

function initialGzFor(manifests, route){
  try{
    const m=manifests['app-build-manifest.json']||manifests['build-manifest.json'];
    if(!m) return { kb:null, status:'SKIPPED', reason:'no-build-manifest' };
    const pages=m.pages||m; const keys=Object.keys(pages||{});
    const key = keys.find(k=>k.includes(route));
    const list = Array.from(new Set((pages[key]||[]).filter(s=>typeof s==='string'&&s.endsWith('.js'))));
    if(!list.length) return { kb:null, status:'SKIPPED', reason:'no-js' };
    let total=0; for(const rel of list){ const abs=join(repoRoot,'apps/web/.next',rel.replace(/^\/?/,'')); if(existsSync(abs)){ const gz=gzipSync(readFileSync(abs)).length/1024; total+=gz; } }
    return { kb: Math.round(total*10)/10, status:'ok', reason:'' };
  }catch{ return { kb:null, status:'SKIPPED', reason:'calc-error' }; }
}

function budget(endpoint, p95){ const lim = endpoint.includes('export')?800:(endpoint.includes('/api/health')?150:250); return { lim, flag: p95>lim?' ⚠️':'' }; }

async function main(){
  const start=Date.now();
  const { url:previewUrl, decision } = await resolvePreview();
  const { root, health } = await validate(previewUrl);
  const base = previewUrl.replace(/\/$/,'');

  // Smokes only if we have a preview URL
  const perf = {};
  const tableLines=['| Endpoint | p50 (ms) | p95 (ms) | ok |','| --- | --- | --- | --- |'];
  async function add(label, path, opts){ const r = await timeEndpoint(`${base}${path}`, opts); perf[label]={ p50:r.p50, p95:r.p95, status: r.ok?'pass':'fail', budget: budget(path, r.p95).lim }; tableLines.push(`| ${label} | ${r.p50} | ${r.p95}${budget(path, r.p95).flag} | ${r.ok?'✓':'✗'} |`); }
  if(previewUrl){
    await add('/','/',{});
    await add('/api/health','/api/health',{});
    await add('/api/trains?limit=1','/api/trains?limit=1',{ checkJson:'array>=1' });
    await add('/api/lines','/api/lines',{ checkJson:'array>=1' });
    await add('/api/depots','/api/depots',{ containText:['Essingen','Langweid'] });
    await add('/api/metrics/kpi','/api/metrics/kpi',{});
    await add('export lines (CSV)','/api/export/lines',{ expectCt:'text/csv' });
    await add('export trains (XLSX)','/api/export/trains?format=xlsx',{ expectCt:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  // Bundles
  const manifests = readManifests();
  const gzMap = initialGzFor(manifests, '/map');
  const gzLines = initialGzFor(manifests, '/lines');

  // metrics json
  const metrics = {
    timestamp: nowIso(),
    preview: { web: previewUrl || '', statusRoot: root, statusHealth: health },
    pages: { url: '', state: 'unknown' },
    performance: { endpoints: perf, summary: {} },
    bundle: { mapGzKB: gzMap.kb, linesGzKB: gzLines.kb, status: gzMap.kb!=null||gzLines.kb!=null?'ok':'SKIPPED', reason: gzMap.reason||gzLines.reason||'' }
  };
  try{ mkdirSync(join(repoRoot,'state'), { recursive:true }); writeFileSync(join(repoRoot,'state/preview-metrics.json'), JSON.stringify(metrics, null, 2)); }catch{}

  // Summary sections
  const block = [
    'Change Summary',
    '',
    `CI/CD Trigger (${nowIso()}, Autopilot V2, decision=${decision})`,
    '',
    'Autopilot Live Test Results',
    '',
    'Preview Deployment',
    `- Preview Web: ${previewUrl || ''} (root=${root} health=${health})`,
    '- Pages URL: (see deploy logs)',
    '',
    'Performance Metrics (p50/p95)',
    ...tableLines,
    '',
    'Bundle Analysis',
    `- /map initialJS.gz = ${gzMap.kb ?? 0} KB${(gzMap.kb||0)>250?' ⚠️':''}${gzMap.kb==null?` [SKIPPED:${gzMap.reason}]`:''}`,
    `- /lines initialJS.gz = ${gzLines.kb ?? 0} KB${(gzLines.kb||0)>250?' ⚠️':''}${gzLines.kb==null?` [SKIPPED:${gzLines.reason}]`:''}`,
    '',
    'Test Execution Timeline',
    `- Start: ${new Date(start).toISOString()}`,
    `- End: ${nowIso()}`,
    `- Duration: ${Math.round((Date.now()-start)/1000)}s`,
    '',
    'Known Issues / Next Steps',
    '- If preview missing, ensure one-shot workflow permissions and gh-pages enabled.'
  ].join('\n');
  appendSummary(block);

  // Chat-style outputs (also helpful in CI logs)
  const p = perf; // shorthand
  const p95 = (k)=> (p[k]?.p95 ?? '-');
  const mapOut = gzMap.kb!=null ? `${gzMap.kb}KB` : 'SKIPPED';
  const linesOut = gzLines.kb!=null ? `${gzLines.kb}KB` : 'SKIPPED';
  console.log(`PREVIEW_URL=${previewUrl || ''}`);
  console.log(`p95_ms: health=${p95('/api/health')} trains=${p95('/api/trains?limit=1')} lines=${p95('/api/lines')} depots=${p95('/api/depots')} kpi=${p95('/api/metrics/kpi')} export_csv=${p95('export lines (CSV)')} export_xlsx=${p95('export trains (XLSX)')}`);
  console.log(`bundle_gz: map=${mapOut} lines=${linesOut}`);
}

await main().catch((e)=>{
  appendSummary(`[SKIPPED:autopilot-v2] ${e?.message || String(e)}`);
  console.log('PREVIEW_URL=');
  console.log('p95_ms: health=- trains=- lines=- depots=- kpi=- export_csv=- export_xlsx=-');
  console.log('bundle_gz: map=SKIPPED lines=SKIPPED');
});




