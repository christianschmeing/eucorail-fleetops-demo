#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); // .../packages/api/scripts
const API_ROOT = dirname(__dirname);   // .../packages/api
const SEEDS_DIR = join(API_ROOT, 'seeds', 'averio');
const REPO_ROOT = join(API_ROOT, '..', '..');
const RESERVE_RATIO = Number(process.env.RESERVE_RATIO ?? 0.12);

function loadJson(rel) { return JSON.parse(readFileSync(join(SEEDS_DIR, rel), 'utf-8')); }
function saveJson(rel, data) { mkdirSync(SEEDS_DIR, { recursive: true }); writeFileSync(join(SEEDS_DIR, rel), JSON.stringify(data, null, 2)); }

function pad(n, len=3) { return String(n).padStart(len, '0'); }

function main() {
  mkdirSync(SEEDS_DIR, { recursive: true });
  const lines = loadJson('lines.json');
  const specs = loadJson('specs.json');

  const bwLines = ['re1','mex13','mex16','re8','re90'];
  const byAllgaeu = ['re72','re96','rb92'];
  const byAugsburg = ['re9','re80','re89','rb86','rb87','rb89'];

  const BW_TOTAL = 66;
  const BY_TOTAL = 78;

  const bwFlirtTotals = { 'flirt3-3':13, 'flirt3-5':19, 'flirt3-4':9, 'flirt3-6':14 }; // 55
  const bwXLTotals = { 'flirt3-xl-3':11 }; // RE90

  const byAllgaeuTotals = { 'flirt3-4-allgaeu':22 }; // split 8/8/6
  const byAugsTotals = { 'mireo-3':44, 'desirohc-5':12 }; // split across 6 lines

  const trains = [];

  const roundRobinAssign = (count, lineIds) => {
    const out = {};
    for (let i=0;i<count;i++) {
      const id = lineIds[i % lineIds.length];
      out[id] = (out[id] ?? 0) + 1;
    }
    return out;
  };

  const bwCoreLines = ['re1','mex13','mex16','re8'];
  const bwCoreTotal = 55;
  const base = Object.fromEntries(bwCoreLines.map(l=>[l,10]));
  const rem = bwCoreTotal - 40;
  const extra = roundRobinAssign(rem, bwCoreLines);
  for (const l of bwCoreLines) base[l] += (extra[l] ?? 0);

  const bwSpecKeys = Object.keys(bwFlirtTotals);
  let serialsBySpec = Object.fromEntries(bwSpecKeys.map(k=>[k,1]));
  const statusForIndex = (idx, perLine) => {
    const reserve = Math.max(0, Math.round(perLine * RESERVE_RATIO));
    if (idx < reserve) return 'standby';
    if (idx === reserve) return 'maintenance';
    return 'active';
  };

  for (const lineId of bwCoreLines) {
    const perLine = base[lineId];
    const mix = {};
    let assigned = 0;
    for (const k of bwSpecKeys) {
      const p = Math.round((bwFlirtTotals[k] / bwCoreTotal) * perLine);
      mix[k] = p; assigned += p;
    }
    while (assigned < perLine) {
      for (const k of bwSpecKeys) { if (assigned < perLine) { mix[k]++; assigned++; } }
    }
    for (const k of bwSpecKeys) {
      const num = mix[k];
      for (let i=0;i<num;i++) {
        const idx = serialsBySpec[k]++;
        trains.push({
          id: `BW-${k}-${pad(idx)}`,
          fleetId: 'averio-bw',
          lineId,
          manufacturerId: 'stadler',
          typeKey: k,
          series: 'FLIRT³',
          buildYear: 2019,
          depot: lineId === 're8' ? 'Essingen' : 'Stuttgart',
          status: statusForIndex(i, num),
          lastSeen: new Date().toISOString(),
          meta: { formation: k.includes('flirt3-') ? `${k.split('-')[1]}-car` : '3-car', etcsPrepared: true }
        });
      }
    }
  }

  let xlIdx = 1;
  for (let i=0;i<bwXLTotals['flirt3-xl-3'];i++) {
    trains.push({
      id: `BW-flirt3-xl-3-${pad(xlIdx++)}`,
      fleetId: 'averio-bw',
      lineId: 're90',
      manufacturerId: 'stadler',
      typeKey: 'flirt3-xl-3',
      series: 'FLIRT³ XL',
      buildYear: 2019,
      depot: 'Essingen',
      status: i === 0 ? 'maintenance' : 'active',
      lastSeen: new Date().toISOString(),
      meta: { formation: '3-car', etcsPrepared: true }
    });
  }

  const allgaeuSplit = { re72:8, re96:8, rb92:6 };
  let allIdx = 1;
  for (const [lineId, num] of Object.entries(allgaeuSplit)) {
    for (let i=0;i<num;i++) {
      trains.push({
        id: `BY-flirt3-4-allgaeu-${pad(allIdx++)}`,
        fleetId: 'averio-by',
        lineId,
        manufacturerId: 'stadler',
        typeKey: 'flirt3-4-allgaeu',
        series: 'FLIRT³',
        buildYear: 2020,
        depot: 'Kempten',
        status: statusForIndex(i, num),
        lastSeen: new Date().toISOString(),
        meta: { formation: '4-car' }
      });
    }
  }

  const augLines = byAugsburg;
  const mireoTarget = 44, dhcTarget = 12;
  const perLineMireo = roundRobinAssign(mireoTarget, augLines);
  const perLineDhc = roundRobinAssign(dhcTarget, augLines);
  let mIdx = 1, dIdx = 1;
  for (const lineId of augLines) {
    const mNum = perLineMireo[lineId] ?? 0;
    const dNum = perLineDhc[lineId] ?? 0;
    for (let i=0;i<mNum;i++) {
      trains.push({
        id: `BY-mireo-3-${pad(mIdx++)}`,
        fleetId: 'averio-by',
        lineId,
        manufacturerId: 'siemens',
        typeKey: 'mireo-3',
        series: 'Mireo',
        buildYear: 2021,
        depot: 'Augsburg',
        status: statusForIndex(i, mNum),
        lastSeen: new Date().toISOString(),
        meta: { formation: '3-car' }
      });
    }
    for (let i=0;i<dNum;i++) {
      trains.push({
        id: `BY-desirohc-5-${pad(dIdx++)}`,
        fleetId: 'averio-by',
        lineId,
        manufacturerId: 'siemens',
        typeKey: 'desirohc-5',
        series: 'Desiro HC',
        buildYear: 2021,
        depot: 'Augsburg',
        status: statusForIndex(i, dNum),
        lastSeen: new Date().toISOString(),
        meta: { formation: '5-car' }
      });
    }
  }

  const bwCount = trains.filter(t=>t.fleetId==='averio-bw').length;
  const byCount = trains.filter(t=>t.fleetId==='averio-by').length;
  saveJson('trains.json', trains);

  try {
    const path = join(REPO_ROOT, 'CHANGESUMMARY.md');
    const summarize = (fleetId) => Object.fromEntries(
      Object.entries(
        trains.filter(t=>t.fleetId===fleetId).reduce((acc,t)=>{ acc[t.lineId]=(acc[t.lineId]??0)+1; return acc; }, {})
      ).sort((a,b)=>a[0].localeCompare(b[0]))
    );
    const entry = `\n\n### Averio seeds generated\n- BW total: ${bwCount} per line: ${JSON.stringify(summarize('averio-bw'))}\n- BY total: ${byCount} per line: ${JSON.stringify(summarize('averio-by'))}\n- Reserve ratio: ${RESERVE_RATIO}`;
    const prev = readFileSync(path, 'utf-8');
    writeFileSync(path, prev + entry);
  } catch {}
}

main();
