/*
  Timetable CSV → JSON cache builder
  - Reads apps/web/config/timetables.json
  - Expects CSV columns: trip_id,service_id,stop_id,stop_name,lat,lon,arrival_time,departure_time
  - Writes per line: apps/web/public/data/timetables/<line_id>.json
*/
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

type StopTime = { stop_id: string; arrival: string; departure: string };
type Trip = { trip_id: string; service_id: string; stop_times: StopTime[] };
type Stop = { stop_id: string; name: string; lat: number; lon: number };
type Timetable = { line_id: string; timezone: string; trips: Trip[]; stops: Stop[] };

type Config = {
  timezone?: string;
  lines?: { line_id: string; region: 'BW' | 'BY'; csv: string }[];
};

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function parseCSV(text: string): Record<string, string>[] {
  const [headerLine, ...rows] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',').map((s) => s.trim());
  return rows.map((r) => {
    const cols = r.split(',');
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));
    return obj;
  });
}

async function main() {
  const cfgPath = path.resolve('apps/web/config/timetables.json');
  const cfg: Config = fs.existsSync(cfgPath)
    ? JSON.parse(fs.readFileSync(cfgPath, 'utf-8'))
    : { lines: [] };
  const tz = cfg.timezone || 'Europe/Berlin';

  const outDir = path.resolve('apps/web/public/data/timetables');
  ensureDir(outDir);

  for (const l of cfg.lines || []) {
    if (!l.csv) continue;
    const res = await fetch(l.csv);
    if (!res.ok) {
      console.error(`Failed to fetch CSV for ${l.line_id}: ${res.status}`);
      continue;
    }
    const text = await res.text();
    const rows = parseCSV(text);
    const stopsMap = new Map<string, Stop>();
    const tripsMap = new Map<string, Trip>();

    for (const row of rows) {
      const trip_id = row.trip_id;
      const service_id = row.service_id;
      const stop_id = row.stop_id;
      if (!trip_id || !stop_id) continue;
      const lat = Number(row.lat);
      const lon = Number(row.lon);
      const stop_name = row.stop_name || stop_id;
      if (!stopsMap.has(stop_id)) stopsMap.set(stop_id, { stop_id, name: stop_name, lat, lon });
      if (!tripsMap.has(trip_id)) tripsMap.set(trip_id, { trip_id, service_id, stop_times: [] });
      const t = tripsMap.get(trip_id)!;
      t.stop_times.push({ stop_id, arrival: row.arrival_time, departure: row.departure_time });
    }

    // sort stop_times and normalize 24:xx → 00:xx+1d (client will expand per-day)
    for (const t of tripsMap.values()) {
      t.stop_times.sort((a, b) =>
        (a.arrival || a.departure).localeCompare(b.arrival || b.departure)
      );
    }

    const timetable: Timetable = {
      line_id: l.line_id,
      timezone: tz,
      trips: Array.from(tripsMap.values()),
      stops: Array.from(stopsMap.values()),
    };

    const outPath = path.join(outDir, `${l.line_id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(timetable, null, 2));
    console.log(`Wrote ${outPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
