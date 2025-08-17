#!/usr/bin/env node
// Minimal GTFS ingestion: downloads zip(s), extracts routes/trips, maps to Averio lines, exports trains.json
// Dependencies: node >=18 (built-in fetch), no external packages required for basic zip streaming

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const SOURCES = [
  // NVBW Open-Data (example placeholder) – replace with real URL
  process.env.GTFS_BW_URL || '',
  // BEG Bayern-Fahrplan (example placeholder)
  process.env.GTFS_BY_URL || ''
].filter(Boolean);

if (SOURCES.length === 0) {
  console.error('No GTFS sources configured. Set GTFS_BW_URL / GTFS_BY_URL.');
  process.exit(1);
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtfs-'));
const target = path.resolve('packages/api/seeds/averio/trains.json');

function unzip(zipFile, outDir) {
  execSync(`unzip -o ${JSON.stringify(zipFile)} -d ${JSON.stringify(outDir)}`);
}

async function download(url, outFile) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
}

function parseCsv(file) {
  const text = fs.readFileSync(file, 'utf-8');
  const [header, ...rows] = text.split(/\r?\n/).filter(Boolean);
  const cols = header.split(',');
  return rows.map((line) => {
    const vals = line.split(',');
    const obj = {};
    cols.forEach((k, i) => (obj[k] = vals[i]));
    return obj;
  });
}

function mapToAverioLine(routeShortName = '') {
  const val = routeShortName.toUpperCase();
  if (val.includes('MEX16')) return 'MEX16';
  if (val.includes('RE8')) return 'RE8';
  if (val.includes('RE9')) return 'RE9';
  if (val.includes('RE1')) return 'RE1';
  if (val.includes('RE7')) return 'RE7';
  if (val.includes('RE10')) return 'RE10';
  if (val.includes('MEX13')) return 'MEX13';
  if (val.includes('MEX14')) return 'MEX14';
  if (val.includes('MEX15')) return 'MEX15';
  return null;
}

const trains = [];

for (const src of SOURCES) {
  const zip = path.join(workDir, path.basename(src.split('?')[0] || 'gtfs.zip'));
  console.log('Downloading', src);
  await download(src, zip);
  const dir = path.join(workDir, path.basename(zip, '.zip'));
  fs.mkdirSync(dir, { recursive: true });
  unzip(zip, dir);

  const routesFile = path.join(dir, 'routes.txt');
  const tripsFile = path.join(dir, 'trips.txt');
  if (!fs.existsSync(routesFile) || !fs.existsSync(tripsFile)) {
    console.warn('Missing routes.txt or trips.txt in', dir);
    continue;
  }
  const routes = parseCsv(routesFile);
  const trips = parseCsv(tripsFile);

  const routeIdToLine = new Map();
  for (const r of routes) {
    const line = mapToAverioLine(r.route_short_name || r.route_long_name || '');
    if (line) routeIdToLine.set(r.route_id, line);
  }

  const counts = new Map();
  for (const t of trips) {
    const line = routeIdToLine.get(t.route_id);
    if (!line) continue;
    const count = (counts.get(line) || 0) + 1;
    counts.set(line, count);
    const idBase = line.replace(/[^A-Z0-9]/g, '');
    const id = `${idBase}-${String(count).padStart(5, '0')}`;
    trains.push({ id, lineId: line, line, name: id, status: 'active' });
  }
}

// Deduplicate by id
const seen = new Set();
const unique = trains.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(unique, null, 2));
console.log(`Saved ${unique.length} trains to ${target}`);


