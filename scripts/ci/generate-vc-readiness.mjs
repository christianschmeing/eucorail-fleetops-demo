#!/usr/bin/env node
/**
 * Generate VC_READINESS.md with real KPIs and public smoke latencies.
 * Also updates CHANGESUMMARY.md with final preview URL/status and a compact table,
 * and injects Try-It links into README.md.
 *
 * Behavior:
 * - Determine preview URL from CHANGESUMMARY.md ("Preview Web:") or remote gh-pages state JSON.
 *   Fallback to local ./state/project-state.json . If none work, try to start local stack with --stream once.
 * - Validate GET / (200/401) and GET /api/health (200). If still not OK, fallback to http://localhost:3002.
 * - Run KPI fetch and public smokes (5 requests per endpoint) and compute p50/p95.
 * - Write docs/VC_READINESS.md with provided template.
 * - Update README.md top with Try-It links and a note about Basic Auth.
 * - Append summary to CHANGESUMMARY.md (preview URL, auth, KPI short, latency table, PR skipped marker if needed).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function env(name, fallback = '') { return process.env[name] ?? fallback; }

function basicAuthHeader() {
  const enable = env('PREVIEW_ENABLE_AUTH') === '1';
  const user = env('PREVIEW_BASIC_USER');
  const pass = env('PREVIEW_BASIC_PASS');
  if (enable && user && pass) {
    const b64 = Buffer.from(`${user}:${pass}`).toString('base64');
    return `Basic ${b64}`;
  }
  return null;
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 6000) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    return r;
  } finally {
    clearTimeout(id);
  }
}

function findPreviewInChangeSummary(txt) {
  const m1 = txt.match(/Preview Web:\s*(https?:\/\/[^\s)]+)(?:\s*\(status=(\d+)\))?/i);
  if (m1) {
    return { url: m1[1], status: m1[2] ? Number(m1[2]) : null };
  }
  const m2 = txt.match(/Stream preview:\s*(https?:\/\/[^\s)]+)(?:\s*\(status=(\d+)\))?/i);
  if (m2) {
    return { url: m2[1], status: m2[2] ? Number(m2[2]) : null };
  }
  return null;
}

async function determinePreviewUrl() {
  // 1) CHANGESUMMARY.md
  try {
    const cs = readFileSync(path.join(repoRoot, 'CHANGESUMMARY.md'), 'utf-8');
    const m = findPreviewInChangeSummary(cs);
    if (m?.url) return { url: m.url, source: 'CHANGESUMMARY' };
  } catch {}

  // 2) remote gh-pages state JSON
  try {
    const url = 'https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/gh-pages/state/project-state.json';
    const r = await fetchWithTimeout(url, {}, 5000);
    if (r.ok) {
      const j = await r.json();
      if (j?.preview?.web) return { url: j.preview.web, source: 'gh-pages' };
    }
  } catch {}

  // 3) local state/project-state.json
  try {
    const p = path.join(repoRoot, 'state', 'project-state.json');
    if (existsSync(p)) {
      const j = JSON.parse(readFileSync(p, 'utf-8'));
      if (j?.preview?.web) return { url: j.preview.web, source: 'local-state' };
    }
  } catch {}

  return { url: null, source: 'none' };
}

async function validatePreview(baseUrl) {
  if (!baseUrl) return { rootStatus: 0, healthStatus: 0 };
  const hdr = basicAuthHeader();
  let rootStatus = 0, healthStatus = 0;
  try {
    const r1 = await fetchWithTimeout(baseUrl.replace(/\/$/, '' ) + '/', { headers: hdr ? { authorization: hdr } : {} }, 5000);
    rootStatus = r1.status;
  } catch { rootStatus = 0; }
  try {
    const r2 = await fetchWithTimeout(baseUrl.replace(/\/$/, '' ) + '/api/health', {}, 5000);
    healthStatus = r2.status;
  } catch { healthStatus = 0; }
  return { rootStatus, healthStatus };
}

async function startStackStreamOnce() {
  return new Promise((resolve) => {
    const proc = spawn('node', ['scripts/dev/start-stack.mjs', '--stream'], { cwd: repoRoot, stdio: 'ignore', detached: true });
    proc.unref();
    resolve(true);
  });
}

async function pickPreviewUrl() {
  let { url, source } = await determinePreviewUrl();
  let { rootStatus, healthStatus } = await validatePreview(url);
  if (!url || !(rootStatus === 200 || rootStatus === 401) || healthStatus !== 200) {
    await startStackStreamOnce();
    // wait and re-check CHANGESUMMARY for up to ~25s
    for (let i = 0; i < 25; i++) {
      await sleep(1000);
      try {
        const cs = readFileSync(path.join(repoRoot, 'CHANGESUMMARY.md'), 'utf-8');
        const m = findPreviewInChangeSummary(cs);
        if (m?.url) { url = m.url; source = 'stream'; break; }
      } catch {}
    }
    const res = await validatePreview(url);
    rootStatus = res.rootStatus; healthStatus = res.healthStatus;
  }
  if (!url) {
    url = 'http://localhost:3002';
    const res = await validatePreview(url);
    rootStatus = res.rootStatus; healthStatus = res.healthStatus;
    source = 'local-default';
  }
  return { url, source, rootStatus, healthStatus };
}

function toMs(n) { return Math.round(n); }

function pXX(arr, p) {
  const a = [...arr].sort((x, y) => x - y);
  if (a.length === 0) return 0;
  const idx = Math.min(a.length - 1, Math.max(0, Math.ceil((p / 100) * a.length) - 1));
  return a[idx];
}

async function timeEndpoint(base, pathOrLabel, options = {}) {
  const baseTrim = base.replace(/\/$/, '');
  const url = pathOrLabel.startsWith('http') ? pathOrLabel : `${baseTrim}${pathOrLabel.startsWith('/') ? '' : '/'}${pathOrLabel}`;
  const hdr = basicAuthHeader();
  const headers = { ...(options.headers || {}), ...(hdr ? { authorization: hdr } : {}) };
  const durations = [];
  let ok = false;
  let lastStatus = 0;
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    try {
      const r = await fetchWithTimeout(url, { headers }, 8000);
      lastStatus = r.status;
      if (!r.ok && !(url.endsWith('/') && (r.status === 401 || r.status === 200))) {
        durations.push(Date.now() - t0);
        continue;
      }
      // content-type checks when required
      if (options.expect) {
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes(options.expect)) {
          durations.push(Date.now() - t0);
          continue;
        }
      }
      // body checks
      if (options.check === 'array>=1') {
        const j = await r.json();
        if (!Array.isArray(j) || j.length < 1) {
          durations.push(Date.now() - t0);
          continue;
        }
      }
      if (options.check === 'depots-contains') {
        const j = await r.json();
        const txt = JSON.stringify(j);
        if (!/Essingen/i.test(txt) || !/Langweid/i.test(txt)) {
          durations.push(Date.now() - t0);
          continue;
        }
      }
      // consume quickly for CSV/XLSX
      if (options.consume === 'text') { await r.text(); }
      ok = true;
      durations.push(Date.now() - t0);
    } catch {
      durations.push(Date.now() - t0);
    }
  }
  return { url, ok, status: lastStatus, p50: toMs(pXX(durations, 50)), p95: toMs(pXX(durations, 95)) };
}

async function fetchKpi(base) {
  try {
    const r = await fetchWithTimeout(base.replace(/\/$/, '') + '/api/metrics/kpi', { headers: basicAuthHeader() ? { authorization: basicAuthHeader() } : {} }, 6000);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function formatSummaryTable(results) {
  const rows = [
    ['Endpoint', 'p50 (ms)', 'p95 (ms)', 'ok'],
    ['/api/health', String(results.health.p50), String(results.health.p95), results.health.ok ? '✓' : '✗'],
    ['/api/trains?limit=1', String(results.trains.p50), String(results.trains.p95), results.trains.ok ? '✓' : '✗'],
    ['/api/lines', String(results.lines.p50), String(results.lines.p95), results.lines.ok ? '✓' : '✗'],
    ['/api/depots', String(results.depots.p50), String(results.depots.p95), results.depots.ok ? '✓' : '✗'],
    ['export lines (CSV)', String(results.exportLines.p50), String(results.exportLines.p95), results.exportLines.ok ? '✓' : '✗'],
    ['export trains (XLSX)', String(results.exportTrains.p50), String(results.exportTrains.p95), results.exportTrains.ok ? '✓' : '✗']
  ];
  const widths = rows[0].map((_, i) => Math.max(...rows.map(r => r[i].length)));
  const mdRow = (r) => `| ${r.map((c, i) => c.padEnd(widths[i], ' ')).join(' | ')} |`;
  const out = [mdRow(rows[0]), mdRow(widths.map(w => '-'.repeat(w))), ...rows.slice(1).map(mdRow)];
  return out.join('\n');
}

function writeChangeSummaryAppend(text) {
  try { writeFileSync(path.join(repoRoot, 'CHANGESUMMARY.md'), `\n\n${text}\n`, { flag: 'a' }); } catch {}
}

function formatPct(n, digits = 1) {
  if (typeof n !== 'number' || !isFinite(n)) return '0';
  return (Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits)).toString();
}

async function main() {
  const { url: previewUrl, source, rootStatus, healthStatus } = await pickPreviewUrl();
  const authKind = basicAuthHeader() ? 'basic' : 'none';

  // KPIs
  const kpi = await fetchKpi(previewUrl);
  const fleetSize = Number(kpi?.fleetSize ?? 0);
  const availabilityPct = Number(kpi?.availabilityPct ?? 0);
  const overdueCount = Number(kpi?.overdueCount ?? 0);
  const woAgingMedianDays = Number(kpi?.woAgingMedianDays ?? 0);
  const depotUtilToday = kpi?.depotUtilToday;
  let depotUtilPct = 0;
  if (depotUtilToday && typeof depotUtilToday === 'object') {
    const vals = Object.values(depotUtilToday).map(Number).filter((x) => isFinite(x));
    if (vals.length) depotUtilPct = vals.reduce((a, b) => a + b, 0) / vals.length * 100;
  }

  // Smokes
  const health = await timeEndpoint(previewUrl, '/api/health');
  const trains = await timeEndpoint(previewUrl, '/api/trains?limit=1', { check: 'array>=1' });
  const lines = await timeEndpoint(previewUrl, '/api/lines', { check: 'array>=1' });
  const depots = await timeEndpoint(previewUrl, '/api/depots', { check: 'depots-contains' });
  const exportLines = await timeEndpoint(previewUrl, '/api/export/lines', { expect: 'text/csv', consume: 'text' });
  const exportTrains = await timeEndpoint(previewUrl, '/api/export/trains?format=xlsx', { expect: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', consume: 'text' });

  const table = formatSummaryTable({ health, trains, lines, depots, exportLines, exportTrains });

  // Update CHANGESUMMARY.md
  const csBlock = [
    '---',
    'Preview Validation',
    `Preview Web: ${previewUrl} (status=${rootStatus})`,
    `Auth: ${authKind}`,
    '',
    'Public Smoke Latencies (p50/p95, ms)',
    table,
    '',
    `KPIs: fleetSize=${fleetSize}, availabilityPct=${availabilityPct}, overdueCount=${overdueCount}, woAgingMedianDays=${woAgingMedianDays}, depotUtilAvgPct=${formatPct(depotUtilPct, 0)}`,
    '',
    '[SKIPPED:pr-create-no-token]'
  ].join('\n');
  writeChangeSummaryAppend(csBlock);

  // Generate docs/VC_READINESS.md
  mkdirSync(path.join(repoRoot, 'docs'), { recursive: true });
  const vcLines = [
    'Eucorail FleetOps — VC Readiness',
    '',
    `Preview: ${previewUrl}  (Auth: ${authKind})`,
    'Local: http://localhost:3002  |  API: http://localhost:4100/api/health',
    '',
    '1) Headline-KPIs',
    `\t•\tFleet size: ${fleetSize}`,
    `\t•\tAvailability: ${formatPct(availabilityPct, 1)}%`,
    `\t•\tOverdue count: ${overdueCount}`,
    `\t•\tWO aging (median): ${woAgingMedianDays} d`,
    `\t•\tDepot utilization (today): ${formatPct(depotUtilPct, 0)} %`,
    '',
    '2) Public smoke results (p50 / p95, ms)',
    `\t•\t/api/health: ${health.p50} / ${health.p95}`,
    `\t•\t/api/trains?limit=1: ${trains.p50} / ${trains.p95}`,
    `\t•\t/api/lines: ${lines.p50} / ${lines.p95}`,
    `\t•\t/api/depots: ${depots.p50} / ${depots.p95}`,
    `\t•\texport lines (CSV): ${exportLines.p50} / ${exportLines.p95}`,
    `\t•\texport trains (XLSX): ${exportTrains.p50} / ${exportTrains.p95}`,
    '',
    '3) How to evaluate (3 Shortcuts)',
    `\t•\tMap (Ops Excellence): ${previewUrl}/map?line=MEX16`,
    `\t•\tECM Planner (Maintenance Control): ${previewUrl}/ecm?tab=planner`,
    `\t•\tFleet Health (Overdue focus): ${previewUrl}/trains?focus=overdue`,
    '',
    '4) What’s in the demo',
    '\t•\tMap → Tooltip (FZ • Slot • UIC, Line-Badge, ECM-Ampel, Next due), Drawer-Tabs gefüllt, flyTo Debounce 150 ms',
    '\t•\tLines/Trains → virtualisierte Tabellen, Facetten, CSV/XLSX-Export, Saved Views',
    '\t•\tECM-Hub → Governance (Sign-Off), Planner (Kanban+Kalender, Capacity-Warnungen), Delivery (Checklist+QA)',
    '',
    '5) Risks & next deltas (ETA)',
    '\t•\tICS export for calendar (S)',
    '\t•\tServer-saved views (M)',
    '\t•\tLive telemetry (LCP/INP to state) (M)',
    '',
    `Generated: ${new Date().toISOString()}`
  ].join('\n');
  writeFileSync(path.join(repoRoot, 'docs', 'VC_READINESS.md'), vcLines);

  // Update README.md – insert Try-It links under badge block
  try {
    const readmePath = path.join(repoRoot, 'README.md');
    const txt = readFileSync(readmePath, 'utf-8');
    const lines = txt.split(/\r?\n/);
    let insertIdx = lines.findIndex(l => /<\/p>\s*$/.test(l));
    if (insertIdx === -1) insertIdx = 6; // after badge
    const block = [
      '',
      '---',
      '',
      `- **Try it (Preview)**: ${previewUrl}`,
      `- **Ops Excellence (Map MEX16)**: ${previewUrl}/map?line=MEX16`,
      `- **Maintenance Control (Planner)**: ${previewUrl}/ecm?tab=planner`,
      `- **Fleet Health (Overdue)**: ${previewUrl}/trains?focus=overdue`,
      '',
      '_Note: Preview is Basic-Auth protected (if configured)._'
    ];
    const alreadyHas = lines.some(l => l.includes('Try it (Preview)'));
    if (!alreadyHas) {
      lines.splice(insertIdx + 1, 0, ...block);
      await writeFile(readmePath, lines.join('\n'));
    } else {
      // Update existing block URLs
      const mapLine = `- **Ops Excellence (Map MEX16)**: `;
      const plannerLine = `- **Maintenance Control (Planner)**: `;
      const healthLine = `- **Fleet Health (Overdue)**: `;
      const tryLine = `- **Try it (Preview)**: `;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(tryLine)) lines[i] = `${tryLine}${previewUrl}`;
        if (lines[i].startsWith(mapLine)) lines[i] = `${mapLine}${previewUrl}/map?line=MEX16`;
        if (lines[i].startsWith(plannerLine)) lines[i] = `${plannerLine}${previewUrl}/ecm?tab=planner`;
        if (lines[i].startsWith(healthLine)) lines[i] = `${healthLine}${previewUrl}/trains?focus=overdue`;
      }
      await writeFile(readmePath, lines.join('\n'));
    }
  } catch {}

  console.log('VC readiness generated:', { previewUrl, auth: authKind, source, rootStatus, healthStatus });
}

await main().catch((e) => {
  console.error('VC readiness generation failed:', e?.stack || String(e));
  process.exit(0);
});




