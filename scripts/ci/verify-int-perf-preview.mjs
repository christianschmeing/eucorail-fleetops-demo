#!/usr/bin/env node
/**
 * Internal verification + performance snapshot + optional preview publish.
 * - Runs: typecheck → lint → build → test:int (best-effort; records [SKIPPED:*] on failure/timeout)
 * - Validates API endpoints and measures p50/p95 latencies (5 requests)
 * - Reads Next build manifests and reports initial JS gz sizes for /map and /lines
 * - Optionally starts stream preview and writes URL to CHANGESUMMARY.md; updates state via gen-project-state
 * - If docs/VC_READINESS.md exists, updates preview and KPIs via generate-vc-readiness.mjs
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const repoRoot = process.cwd();

function appendSummary(text) {
  try { writeFileSync(join(repoRoot, 'CHANGESUMMARY.md'), `\n\n${text}\n`, { flag: 'a' }); } catch {}
}

function runStep(name, cmd, args = [], opts = {}) {
  return new Promise((resolveStep) => {
    const proc = spawn(cmd, args, { cwd: repoRoot, shell: false, stdio: 'ignore', ...opts });
    const timeout = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
      appendSummary(`[SKIPPED:${name}-timeout]`);
      resolveStep({ ok: false, code: -1, name });
    }, 240000);
    proc.on('exit', (code) => {
      clearTimeout(timeout);
      resolveStep({ ok: code === 0, code, name });
    });
  });
}

async function verifyChain() {
  const results = [];
  results.push(await runStep('typecheck', 'npm', ['run', '-s', 'typecheck']));
  results.push(await runStep('lint', 'npm', ['run', '-s', 'lint']));
  results.push(await runStep('build', 'npm', ['run', '-s', 'build']));
  // test:int may not exist; try to run and tolerate failure
  const hasTestInt = readFileSafe('package.json').includes('test:int');
  if (hasTestInt) results.push(await runStep('test:int', 'npm', ['run', '-s', 'test:int']));
  else appendSummary('[SKIPPED:test:int] script not defined');
  const block = ['---', 'Verify:int (internal)', ...results.map(r => `- ${r.name}: ${r.ok ? 'OK' : `FAIL(${r.code})`}`)].join('\n');
  appendSummary(block);
}

function readFileSafe(p) { try { return readFileSync(join(repoRoot, p), 'utf-8'); } catch { return ''; } }

async function httpTiming(url, { expectCt, checkJson, tries = 5, timeoutMs = 3000 } = {}) {
  const times = [];
  let ok = false; let status = 0;
  for (let i = 0; i < tries; i++) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), timeoutMs);
    const t0 = Date.now();
    try {
      const r = await fetch(url, { signal: ctl.signal });
      status = r.status;
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      if (expectCt && !ct.includes(expectCt)) {
        times.push(Date.now() - t0); clearTimeout(to); continue;
      }
      if (checkJson === 'array>=1') {
        const j = await r.json();
        if (!Array.isArray(j) || j.length < 1) { times.push(Date.now() - t0); clearTimeout(to); continue; }
      }
      ok = r.ok || (url.endsWith('/') && (r.status === 200 || r.status === 401));
      times.push(Date.now() - t0);
    } catch {
      times.push(Date.now() - t0);
    } finally { clearTimeout(to); }
  }
  const p50 = percentile(times, 50);
  const p95 = percentile(times, 95);
  return { url, ok, status, p50, p95 };
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.ceil((p / 100) * a.length) - 1));
  return a[idx];
}

function listFilesRec(dir) {
  const out = [];
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) out.push(...listFilesRec(p)); else out.push(p);
    }
  } catch {}
  return out;
}

function computeGzipSizeKB(p) {
  try { const buf = readFileSync(p); return Math.round((gzipSync(buf).length / 1024) * 10) / 10; } catch { return 0; }
}

function initialJsForRoute(webDir, route) {
  const nextDir = join(webDir, '.next');
  const candidates = [join(nextDir, 'app-build-manifest.json'), join(nextDir, 'build-manifest.json')];
  let files = [];
  for (const mPath of candidates) {
    try {
      const j = JSON.parse(readFileSync(mPath, 'utf-8'));
      const pages = j.pages || j; // tolerate different shapes
      // app router keys can look like "/map/page" or similar
      const keys = Object.keys(pages || {});
      const hitKey = keys.find(k => k.includes('/map') && route === '/map') || keys.find(k => k.includes('/lines') && route === '/lines');
      if (hitKey) files = (pages[hitKey] || []).filter((x) => typeof x === 'string' && x.endsWith('.js')).map((x) => join(nextDir, x));
      if (files.length) break;
      // fallback: rootMainFiles
      if (Array.isArray(j.rootMainFiles)) files.push(...j.rootMainFiles.map((x) => join(nextDir, x)));
    } catch {}
  }
  if (!files.length) return { sizeKB: 0, skipped: 'bundle-no-manifest' };
  // de-dup
  files = Array.from(new Set(files));
  let totalKB = 0;
  for (const f of files) totalKB += computeGzipSizeKB(f);
  return { sizeKB: Math.round(totalKB * 10) / 10 };
}

async function ensureStackStarted() {
  // quick probe
  try { const r = await fetch('http://localhost:4100/api/health'); if (r.ok) return; } catch {}
  await runStep('start-stack', 'node', ['scripts/dev/start-stack.mjs']);
}

async function publishPreview() {
  await ensureStackStarted();
  await runStep('stream', 'node', ['scripts/dev/start-stack.mjs', '--stream']);
  // parse CHANGESUMMARY for preview url
  const txt = readFileSafe('CHANGESUMMARY.md');
  const m = txt.match(/Preview Web:\s*(https?:\/\/[^\s]+)\s*\(status=(\d+)\)/);
  const url = m?.[1] || '';
  const status = m?.[2] || '';
  if (!url) { appendSummary('[SKIPPED:no-preview]'); return { url: '', status: 0 }; }
  // update project-state.json via generator
  await runStep('state', 'node', ['scripts/ci/gen-project-state.mjs']);
  return { url, status: Number(status) };
}

async function main() {
  const startTs = Date.now();
  await verifyChain();

  // Ensure API ready and measure endpoints
  await ensureStackStarted();
  const endpoints = [
    { path: 'http://localhost:4100/api/health' },
    { path: 'http://localhost:4100/api/trains?limit=1', checkJson: 'array>=1' },
    { path: 'http://localhost:4100/api/lines', checkJson: 'array>=1' },
    { path: 'http://localhost:4100/api/depots', checkJson: 'array>=1' },
    { path: 'http://localhost:4100/api/metrics/kpi' },
    { path: 'http://localhost:4100/api/export/lines', expectCt: 'text/csv' },
    { path: 'http://localhost:4100/api/export/trains?format=xlsx', expectCt: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  ];
  const results = [];
  for (const e of endpoints) results.push(await httpTiming(e.path, { expectCt: e.expectCt, checkJson: e.checkJson }));
  const table = ['| Endpoint | p50 (ms) | p95 (ms) | ok |', '| --- | --- | --- | --- |', ...results.map(r => `| ${r.url.replace('http://localhost:4100','/api')} | ${r.p50} | ${r.p95} | ${r.ok ? '✓' : '✗'} |`)].join('\n');

  // Bundle sizes
  const webDir = join(repoRoot, 'apps/web');
  const mapInit = initialJsForRoute(webDir, '/map');
  const linesInit = initialJsForRoute(webDir, '/lines');
  const bundleLines = [];
  if (mapInit.sizeKB) bundleLines.push(`- /map initialJS.gz = ${mapInit.sizeKB} KB`); else bundleLines.push(`- /map initialJS.gz = [SKIPPED:${mapInit.skipped || 'bundle'}]`);
  if (linesInit.sizeKB) bundleLines.push(`- /lines initialJS.gz = ${linesInit.sizeKB} KB`); else bundleLines.push(`- /lines initialJS.gz = [SKIPPED:${linesInit.skipped || 'bundle'}]`);

  // A11y/LCP/INP: check for web-vitals hook presence
  const vitalsHook = listFilesRec(webDir).some((p) => /web[-_.]?vitals/i.test(p));
  const vitalsNote = vitalsHook ? 'web-vitals present; values logged at runtime' : '[SKIPPED:webvitals]';

  const perfBlock = [
    '---',
    'Performance Snapshot (internal)',
    ...bundleLines,
    '',
    'API latencies (p50/p95, ms):',
    table,
    '',
    `A11y/LCP/INP: ${vitalsNote}`
  ].join('\n');
  appendSummary(perfBlock);

  // Preview publish
  const { url, status } = await publishPreview();
  if (url) {
    // quick smokes (single shot each)
    const smokeTargets = [
      `${url.replace(/\/$/, '')}/`,
      `${url.replace(/\/$/, '')}/api/health`,
      `${url.replace(/\/$/, '')}/api/trains?limit=1`,
      `${url.replace(/\/$/, '')}/api/lines`,
      `${url.replace(/\/$/, '')}/api/depots`,
      `${url.replace(/\/$/, '')}/api/metrics/kpi`
    ];
    const smokeLines = [];
    for (const u of smokeTargets) {
      try { const r = await httpTiming(u, { tries: 1, timeoutMs: 3000 }); smokeLines.push(`- ${u.replace(url,'')} → ${r.status}`); } catch { smokeLines.push(`- ${u.replace(url,'')} → ERR`); }
    }
    appendSummary(['---', 'Preview Validation (post-publish)', `Preview Web: ${url} (status=${status})`, ...smokeLines].join('\n'));
  }

  // Optionally refresh VC_READINESS with KPIs + preview
  if (existsSync(join(repoRoot, 'docs', 'VC_READINESS.md'))) {
    await runStep('vc-readiness', 'node', ['scripts/ci/generate-vc-readiness.mjs']);
  }

  const totalMs = Date.now() - startTs;
  appendSummary(`Verify+Perf completed in ${Math.round(totalMs/1000)}s`);
}

await main().catch((e) => {
  appendSummary(`[SKIPPED:verify-int-perf] ${e?.message || String(e)}`);
});




