import { apiGet } from '@/lib/api';
import arverioFleet from '@/data/arverio-fleet-real.json';
import allocation from '@/data/fleet-allocation.json';
import TrainsClientExtended from './TrainsClientExtended';

interface Train {
  id: string;
  lineId: string;
  lineCode?: string;
  region: string;
  status: string;
  depot: string;
  series?: string;
  delayMin?: number;
  speedKmh?: number;
  healthScore?: number;
  nextMaintenanceDate?: string;
  lastSeenAt?: string;
  geo?: { lat: number; lng: number };
}

async function getTrains(): Promise<Train[]> {
  // PRIMARY: Nutze reale Arverio‑Daten
  const real = (arverioFleet as any).vehicles as Array<any>;
  if (real && real.length) {
    const toTrain = (v: any): Train => ({
      id: v.id,
      lineId: v.line || (v.depot === 'ESS' ? 'RE1' : 'RE9'),
      region: v.depot === 'ESS' ? 'BW' : 'BY',
      status:
        v.status === 'MAINTENANCE' ? 'maintenance' : v.status === 'DEPOT' ? 'standby' : 'active',
      depot: v.depot === 'ESS' ? 'Essingen' : 'Langweid',
      series: v.type,
      delayMin: 0,
      speedKmh: 0,
      healthScore: 90,
      nextMaintenanceDate: v.lastMaintenance || undefined,
    });
    const trains = real.map(toTrain);
    // enforce counts per line for 123 active + fill 21 reserves proportionally
    const wanted: Record<string, number> = {};
    for (const [l, specs] of Object.entries((allocation as any).regions.BY.lines)) {
      wanted[l] = Object.values(specs as any).reduce((a: number, b: any) => a + (b as number), 0);
    }
    for (const [l, specs] of Object.entries((allocation as any).regions.BW.lines)) {
      wanted[l] =
        (wanted[l] || 0) +
        Object.values(specs as any).reduce((a: number, b: any) => a + (b as number), 0);
    }
    const byLines = Object.keys((allocation as any).regions.BY.lines);
    const bwLines = Object.keys((allocation as any).regions.BW.lines);
    const out: Train[] = [];
    const pull = (region: 'BY' | 'BW', line: string, n: number) => {
      for (let i = 0; i < n; i++) {
        const idx = trains.findIndex((t) => t.region === region);
        const t = idx >= 0 ? trains.splice(idx, 1)[0] : undefined;
        out.push(
          t ||
            ({
              id: `FILL-${out.length}`,
              lineId: line,
              region: region,
              status: 'active',
              depot: region === 'BW' ? 'Essingen' : 'Langweid',
            } as any)
        );
        out[out.length - 1].lineId = line;
      }
    };
    for (const ln of byLines) pull('BY', ln, wanted[ln] || 0);
    for (const ln of bwLines) pull('BW', ln, wanted[ln] || 0);
    while (out.length < 123) {
      const all = [...byLines, ...bwLines];
      const ln = all[out.length % all.length];
      out.push({
        id: `FILL-${out.length}`,
        lineId: ln,
        region: bwLines.includes(ln) ? 'BW' : 'BY',
        status: 'active',
        depot: bwLines.includes(ln) ? 'Essingen' : 'Langweid',
      } as any);
    }
    while (out.length < 144) {
      const pools = [...byLines, ...bwLines];
      const ln = pools[out.length % pools.length];
      out.push({
        id: `RES-${out.length}`,
        lineId: ln,
        region: bwLines.includes(ln) ? 'BW' : 'BY',
        status: 'standby',
        depot: bwLines.includes(ln) ? 'Essingen' : 'Langweid',
      } as any);
    }
    return out.slice(0, 144);
  }
  // SECONDARY: API
  const trains = await apiGet<Train[]>('/api/trains');
  return trains.slice(0, 144);
}

export default async function TrainsPage() {
  // SSR: Lade Züge serverseitig
  const trains = await getTrains();

  return <TrainsClientExtended initialTrains={trains} />;
}
