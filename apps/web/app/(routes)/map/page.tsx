import { apiGet } from '@/lib/api';
import arverioFleet from '@/data/arverio-fleet-real.json';
import allocation from '@/data/fleet-allocation.json';
import linesData from '@/data/lines-complete.json';
import MapClient from './MapClient';

interface Train {
  id: string;
  status: string;
  lineId: string;
  region: string;
  position?: { lat: number; lng: number };
  delayMin?: number;
}

type LatLng = { lat: number; lon?: number; lng?: number };

function indexLinesById(): Record<string, LatLng[]> {
  const map: Record<string, LatLng[]> = {};
  const groups: any[] = [
    ...((linesData as any).baden_wuerttemberg ?? []),
    ...((linesData as any).bayern ?? []),
  ];
  for (const g of groups) {
    if (g?.id && Array.isArray(g.stations)) map[g.id] = g.stations as LatLng[];
  }
  return map;
}

const LINES_BY_ID = indexLinesById();

function sampleOnLine(lineId: string): { lat: number; lng: number } {
  const stations = LINES_BY_ID[lineId] || LINES_BY_ID['RE9'] || [];
  if (stations.length < 2) return { lat: 48.8, lng: 10.0 };
  const idx = Math.max(
    0,
    Math.min(stations.length - 2, Math.floor(Math.random() * (stations.length - 1)))
  );
  const a = stations[idx];
  const b = stations[idx + 1];
  const t = Math.random();
  const lat = a.lat * (1 - t) + b.lat * t;
  const lngA = a.lng ?? a.lon ?? 0;
  const lngB = b.lng ?? b.lon ?? 0;
  const lng = lngA * (1 - t) + lngB * t;
  return { lat, lng };
}

function distributeToAllocation(seed: Train[]): Train[] {
  const byLines = Object.keys((allocation as any).regions.BY.lines);
  const bwLines = Object.keys((allocation as any).regions.BW.lines);
  const wanted: Record<string, number> = {};
  for (const [line, specs] of Object.entries((allocation as any).regions.BY.lines)) {
    wanted[line] = Object.values(specs as any).reduce((a: number, b: any) => a + (b as number), 0);
  }
  for (const [line, specs] of Object.entries((allocation as any).regions.BW.lines)) {
    wanted[line] =
      (wanted[line] || 0) +
      Object.values(specs as any).reduce((a: number, b: any) => a + (b as number), 0);
  }
  const out: Train[] = [];
  const byPool = seed.filter((t) => t.region === 'BY');
  const bwPool = seed.filter((t) => t.region === 'BW');
  const take = (pool: Train[], line: string, n: number) => {
    for (let i = 0; i < n; i++) {
      const t = pool.pop() || seed.pop();
      if (!t) break;
      out.push({ ...t, lineId: line, position: sampleOnLine(line), status: 'active' });
    }
  };
  for (const ln of byLines) take(byPool, ln, wanted[ln] || 0);
  for (const ln of bwLines) take(bwPool, ln, wanted[ln] || 0);
  while (out.length < 123) {
    const all = [...byLines, ...bwLines];
    const ln = all[out.length % all.length];
    out.push({
      id: `FILL-${out.length}`,
      lineId: ln,
      region: bwLines.includes(ln) ? 'BW' : 'BY',
      status: 'active',
      position: sampleOnLine(ln),
    });
  }
  while (out.length < 144) {
    const pools = [...byLines, ...bwLines];
    const ln = pools[out.length % pools.length];
    out.push({
      id: `RES-${out.length}`,
      lineId: ln,
      region: bwLines.includes(ln) ? 'BW' : 'BY',
      status: 'standby',
      position: sampleOnLine(ln),
    });
  }
  return out.slice(0, 144);
}

async function getTrains(): Promise<Train[]> {
  // PRIMARY: Arverio Real‑Daten
  const real = (arverioFleet as any).vehicles as Array<any>;
  if (real && real.length) {
    const mapTrain = (v: any): Train => {
      const region = v.depot === 'ESS' ? 'BW' : 'BY';
      const fallbackLine =
        region === 'BW'
          ? ['MEX13', 'RE1', 'MEX16', 'RE8', 'RE90'][Math.floor(Math.random() * 5)]
          : ['RE9', 'RE80', 'RE89', 'RB86', 'RB87', 'RB89', 'RE72', 'RE96', 'RB92'][
              Math.floor(Math.random() * 9)
            ];
      const lineId = v.line || fallbackLine;
      const status =
        v.status === 'MAINTENANCE' ? 'maintenance' : v.status === 'DEPOT' ? 'offline' : 'active';
      const pos = v.position
        ? { lat: v.position.lat ?? v.position.latitude, lng: v.position.lng ?? v.position.lon }
        : sampleOnLine(lineId);
      return {
        id: v.id,
        lineId,
        region,
        status,
        position: pos,
        delayMin: 0,
      };
    };
    const trains = real.map(mapTrain);
    return distributeToAllocation(trains);
  }
  // SECONDARY: API
  return await apiGet<Train[]>('/api/trains');
}

export default async function MapPage() {
  // SSR: Lade Züge serverseitig
  const trains = await getTrains();

  // Berechne initiale KPIs
  const statusCounts = trains.reduce(
    (acc, train) => {
      const status = train.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const initialKpis = {
    total: trains.length,
    active: statusCounts.active || 0,
    maintenance: statusCounts.maintenance || 0,
    alarm: (statusCounts.alarm || 0) + (statusCounts.inspection || 0),
    offline: (statusCounts.offline || 0) + (statusCounts.standby || 0),
  };

  return <MapClient initialTrains={trains} initialKpis={initialKpis} />;
}
