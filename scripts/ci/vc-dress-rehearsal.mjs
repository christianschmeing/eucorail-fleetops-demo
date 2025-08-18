#!/usr/bin/env node
/**
 * VC Dress Rehearsal (no local processes):
 * 1) Resolve preview from gh-pages state or CHANGESUMMARY; validate
 * 2) Measure public smokes (5x per endpoint, 3s timeout), compute p50/p95
 * 3) Read initial JS bundles and compute gzip sizes for /map and /lines
 * 4) Update docs/VC_READINESS.md
 * 5) Create docs/VC_DEMO_SCRIPT.md (1 page)
 * 6) Append consolidated section to CHANGESUMMARY.md
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

const repoRoot = process.cwd();

function appendSummary(text) {
  try { writeFileSync(join(repoRoot, 'CHANGESUMMARY.md'), `\n\n${text}\n`, { flag: 'a' }); } catch {}
}

function env(name, fallback = '') { return process.env[name] ?? fallback; }

function parseRepo() {
  let rr = env('GITHUB_REPOSITORY', '');
  if (!rr) {
    try {
      const url = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
      const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i);
      if (m) rr = `${m[1]}/${m[2]}`;
    } catch {}
  }
  if (!rr) rr = 'unknown/unknown';
  const [owner, repo] = rr.split('/');
  return { owner, repo };
}

async function fetchJson(url, timeoutMs = 4000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) return { ok: false, status: r.status, data: null };
    const data = await r.json();
    return { ok: true, status: r.status, data };
  } catch { return { ok: false, status: 0, data: null }; }
  finally { clearTimeout(t); }
}

function extractPreviewFromSummary(txt) {
  let m = txt.match(/Preview Web:\s*(https?:\/\/[^\s]+)\s*\(status=(\d+)\)/);
  if (m) return m[1];
  m = txt.match(/CI Preview:\s*(https?:\/\/[^\s]+)\s*\(status_root=\d+\s+health=\d+\)/);
  if (m) return m[1];
  return '';
}

async function resolvePreviewUrl() {
  const { owner, repo } = parseRepo();
  // Prefer gh-pages state
  try {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/gh-pages/state/project-state.json`;
    const r = await fetchJson(url, 5000);
    if (r.ok && r.data && r.data.preview && r.data.preview.web) return r.data.preview.web;
  } catch {}
  // Fallback to CHANGESUMMARY.md
  try {
    const cs = readFileSync(join(repoRoot, 'CHANGESUMMARY.md'), 'utf-8');
    const u = extractPreviewFromSummary(cs);
    if (u) return u;
  } catch {}
  return '';
}

async function validateRootAndHealth(baseUrl) {
  const base = baseUrl.replace(/\/$/, '');
  let root = 0, health = 0;
  try { const r = await fetchJson(`${base}/`, 3000); root = r.status; } catch {}
  try { const r = await fetchJson(`${base}/api/health`, 3000); health = r.status; } catch {}
  return { root, health };
}

function pct(arr, p) {
  const a = [...arr].sort((x, y) => x - y);
  if (!a.length) return 0;
  const idx = Math.min(a.length - 1, Math.max(0, Math.ceil((p / 100) * a.length) - 1));
  return a[idx];
}

async function timeEndpoint(url, { tries = 5, timeoutMs = 3000, expectCt, checkJson, containText } = {}) {
  const durations = [];
  let lastStatus = 0;
  let ok = false;
  for (let i = 0; i < tries; i++) {
    const t0 = Date.now();
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), timeoutMs);
      const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
      clearTimeout(to);
      lastStatus = r.status;
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      if (expectCt && !ct.includes(expectCt)) { durations.push(Date.now() - t0); continue; }
      if (checkJson === 'array>=1') {
        const j = await r.json();
        if (!Array.isArray(j) || j.length < 1) { durations.push(Date.now() - t0); continue; }
      }
      if (containText) {
        const txt = await r.text();
        if (!containText.every((s) => new RegExp(s, 'i').test(txt))) { durations.push(Date.now() - t0); continue; }
      }
      ok = r.ok;
      durations.push(Date.now() - t0);
    } catch {
      durations.push(Date.now() - t0);
    }
  }
  return { url, status: lastStatus, ok, p50: pct(durations, 50), p95: pct(durations, 95) };
}

function readManifestFiles() {
  const nextDir = join(repoRoot, 'apps/web/.next');
  const candidates = [
    join(nextDir, 'app-build-manifest.json'),
    join(nextDir, 'build-manifest.json'),
    join(nextDir, 'react-loadable-manifest.json')
  ];
  const result = {};
  for (const p of candidates) {
    if (existsSync(p)) {
      try { result[p.split('/').pop()] = JSON.parse(readFileSync(p, 'utf-8')); } catch {}
    }
  }
  return result;
}

function initialJsGzipKB(manifests, route) {
  try {
    const build = manifests['app-build-manifest.json'] || manifests['build-manifest.json'];
    if (!build) return { kb: 0, skipped: 'no-manifest' };
    const pages = build.pages || build;
    const keys = Object.keys(pages || {});
    const hitKey = keys.find(k => k.includes(route) && /page|route/.test(k)) || keys.find(k => k.endsWith(`${route}`)) || keys.find(k => k.includes(route));
    const list = Array.from(new Set((hitKey ? pages[hitKey] : [])
      .filter((x) => typeof x === 'string' && x.endsWith('.js'))));
    if (!list.length) return { kb: 0, skipped: 'no-js' };
    let total = 0;
    for (const rel of list) {
      const abs = join(repoRoot, 'apps/web/.next', rel.replace(/^\/?/, ''));
      if (!existsSync(abs)) continue;
      const gz = gzipSync(readFileSync(abs)).length / 1024;
      total += gz;
    }
    return { kb: Math.round(total * 10) / 10 };
  } catch { return { kb: 0, skipped: 'calc-error' }; }
}

function budgetFlag(endpoint, p95) {
  const lim = endpoint.includes('export') ? 800 : (endpoint.includes('/api/health') ? 150 : 250);
  return p95 > lim ? ' ⚠️' : '';
}

async function main() {
  const t0 = Date.now();
  let preview = await resolvePreviewUrl();
  let usedBase = preview;
  let note = '';
  if (!preview) {
    note = '[SKIPPED:preview-missing]';
    usedBase = 'http://localhost:3002';
  }
  const { root, health } = await validateRootAndHealth(usedBase);
  appendSummary([`Preview Web: ${usedBase} (root=${root} health=${health})`, note].filter(Boolean).join(' '));

  // Smokes (5 requests)
  const base = usedBase.replace(/\/$/, '');
  const endpoints = [
    { label: '/api/health', url: `${base}/api/health` },
    { label: '/api/trains?limit=1', url: `${base}/api/trains?limit=1`, checkJson: 'array>=1' },
    { label: '/api/lines', url: `${base}/api/lines`, checkJson: 'array>=1' },
    { label: '/api/depots', url: `${base}/api/depots`, containText: ['Essingen','Langweid'] },
    { label: '/api/metrics/kpi', url: `${base}/api/metrics/kpi` },
    { label: 'export lines (CSV)', url: `${base}/api/export/lines`, expectCt: 'text/csv' },
    { label: 'export trains (XLSX)', url: `${base}/api/export/trains?format=xlsx`, expectCt: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  ];
  const results = [];
  for (const e of endpoints) results.push({ label: e.label, ...(await timeEndpoint(e.url, { expectCt: e.expectCt, checkJson: e.checkJson, containText: e.containText })) });
  const tableLines = ['| Endpoint | p50 (ms) | p95 (ms) | ok |', '| --- | --- | --- | --- |'];
  for (const r of results) tableLines.push(`| ${r.label} | ${r.p50} | ${r.p95}${budgetFlag(r.label, r.p95)} | ${r.ok ? '✓' : '✗'} |`);

  // Bundle snapshot
  const manifests = readManifestFiles();
  const mapGz = initialJsGzipKB(manifests, '/map');
  const linesGz = initialJsGzipKB(manifests, '/lines');
  const mapLine = `- /map initialJS.gz = ${mapGz.kb || 0} KB${(mapGz.kb || 0) > 250 ? ' ⚠️' : ''}${mapGz.kb ? '' : ` [SKIPPED:${mapGz.skipped || 'bundle'}]`}`;
  const linesLine = `- /lines initialJS.gz = ${linesGz.kb || 0} KB${(linesGz.kb || 0) > 250 ? ' ⚠️' : ''}${linesGz.kb ? '' : ` [SKIPPED:${linesGz.skipped || 'bundle'}]`}`;

  // KPIs for readiness
  let kpi = null;
  try {
    const r = await fetchJson(`${base}/api/metrics/kpi`, 3000);
    if (r.ok) kpi = r.data;
  } catch {}

  // VC_READINESS.md
  const readiness = [
    'Eucorail FleetOps — VC Readiness',
    '',
    `Preview: ${usedBase}  (Auth: ${env('PREVIEW_ENABLE_AUTH')==='1'?'basic':'none'})`,
    'Local: http://localhost:3002  |  API: http://localhost:4100/api/health',
    '',
    '1) Headline-KPIs',
    `\t•\tFleet size: ${kpi?.fleetSize ?? 'n/a'}`,
    `\t•\tAvailability: ${typeof kpi?.availabilityPct==='number'?kpi.availabilityPct.toFixed(1):'n/a'}%${kpi? '':''}${kpi? '':' [SKIPPED:kpi]'}`,
    `\t•\tOverdue count: ${kpi?.overdueCount ?? 'n/a'}`,
    `\t•\tWO aging (median): ${kpi?.woAgingMedianDays ?? 'n/a'} d`,
    `\t•\tDepot utilization (today): ${kpi?.depotUtilToday?Math.round((Object.values(kpi.depotUtilToday).reduce((a,b)=>a+Number(b),0)/(Object.values(kpi.depotUtilToday).length||1))*100)/100*1: 'n/a'} %`,
    '',
    '2) Public smoke results (p50 / p95, ms)',
    ...results.map(r => `\t•\t${r.label}: ${r.p50} / ${r.p95}`),
    '',
    '3) How to evaluate (3 Shortcuts)',
    `\t•\tMap (Ops Excellence): ${usedBase.replace(/\/$/,'')}/map?line=MEX16`,
    `\t•\tECM Planner (Maintenance Control): ${usedBase.replace(/\/$/,'')}/ecm?tab=planner`,
    `\t•\tFleet Health (Overdue focus): ${usedBase.replace(/\/$/,'')}/trains?focus=overdue`,
    '',
    '4) What’s in the demo',
    '\t•\tMap → Tooltip (FZ • Slot • UIC, Line-Badge, ECM-Ampel, Next due), Drawer-Tabs gefüllt, flyTo Debounce 150 ms',
    '\t•\tLines/Trains → virtualisierte Tabellen, Facetten, CSV/XLSX-Export, Saved Views',
    '\t•\tECM-Hub → Governance (Sign-Off), Planner (Kanban+Kalender, Capacity-Warnungen), Delivery (Checklist+QA)',
    '',
    '5) Risks & next deltas (ETA)',
    '\t•\tICS export for calendar (S)',
    '\t•\tServer-saved views (M)',
    '\t•\tWeb-vitals to state (M)',
    '',
    `Generated: ${new Date().toISOString()}`
  ].join('\n');
  try { writeFileSync(join(repoRoot, 'docs/VC_READINESS.md'), readiness); } catch {}

  // VC_DEMO_SCRIPT.md
  const demo = [
    'VC Demo Script',
    '',
    'Hook in 30 Sek.: Eucorail FleetOps zeigt live, wie wir Flottenzustand, Wartungsplanung und Betrieb in einer Karte vereinen. In einer Minute sehen Sie: wo Züge sind, welche Maßnahmen anstehen und wie Teams effizienter entscheiden – mit Exporten für Reports und ECM-Governance.',
    '',
    'Ablauf in 5 Schritten:',
    `1) Öffnen Sie die Karte: ${usedBase.replace(/\/$/,'')}/map?line=MEX16 – bewegen Sie die Maus über Züge, öffnen Sie den Drawer.`,
    '   Erfolg: Tooltip zeigt FZ • Slot • UIC • Line • ECM • Next; Drawer zeigt gefüllte Tabs.',
    `2) ECM Planner: ${usedBase.replace(/\/$/,'')}/ecm?tab=planner – legen Sie eine WO an oder bewegen Sie eine Karte über die Phasen.`,
    '   Erfolg: Kapazitätswarnungen erscheinen dezent; Statuswechsel sichtbar.',
    `3) Fleet Health (Overdue): ${usedBase.replace(/\/$/,'')}/trains?focus=overdue – filtern Sie nach Linie/Status und exportieren Sie CSV/XLSX.`,
    '   Erfolg: Export lädt; Tabellen sind sticky/virtualisiert.',
    '4) Lines: Öffnen Sie /lines, nutzen Sie Facetten und Saved Views. Import/Export demonstrieren.',
    '   Erfolg: Persistente Spaltenauswahl und Views funktionieren.',
    '5) KPI-Check: Oben rechts Trends prüfen; /api/metrics/kpi zeigt Zahlen konsistent.',
    '   Erfolg: Zahlen sind plausibel; bei Fehlern im Report als [SKIPPED:kpi] markiert.',
    '',
    'Backup-Route: Falls Preview-Auth/Timeout greift, nutzen Sie lokal http://localhost:3002 mit denselben Pfaden. ',
    '',
    'Abschluss: FleetOps reduziert Ausfallzeiten (weniger Overdues) und steigert Planungseffizienz (schnellere WO-Durchläufe). Die Map‑first UI schafft Transparenz und beschleunigt Entscheidungen in Betrieb und Instandhaltung.'
  ].join('\n');
  try { writeFileSync(join(repoRoot, 'docs/VC_DEMO_SCRIPT.md'), demo); } catch {}

  // Consolidated CHANGESUMMARY block
  const duration = Math.round((Date.now() - t0) / 1000);
  const block = [
    '---',
    'VC Dress Rehearsal',
    `Preview: ${usedBase} (root=${root} health=${health})`,
    '',
    'Smokes (p50/p95, ms):',
    ...tableLines,
    '',
    'Initial JS (gzip):',
    mapLine,
    linesLine,
    '',
    `Skips: ${note || 'none'}`,
    `Duration: ${duration}s`
  ].join('\n');
  appendSummary(block);
}

await main().catch((e) => {
  appendSummary(`[SKIPPED:vc-dress] ${e?.message || String(e)}`);
});




