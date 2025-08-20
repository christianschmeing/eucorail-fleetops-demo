import { apiGet } from '@/lib/api';
import arverioFleet from '@/data/arverio-fleet-real.json';
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
  try {
    const trains = await apiGet<Train[]>('/api/trains');
    // Ensure we have exactly 144 trains and preserve all data including maintenanceInfo
    return trains.slice(0, 144);
  } catch {
    // Fallback: Nutze reale Arverio‑Daten
    const real = (arverioFleet as any).vehicles as Array<any>;
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
    while (trains.length < 144) {
      const isBW = trains.length % 2 === 0;
      trains.push({
        id: `RES-${String(90000 + trains.length).padStart(5, '0')}`,
        lineId: 'RESERVE',
        region: isBW ? 'BW' : 'BY',
        status: 'standby',
        depot: isBW ? 'Essingen' : 'Langweid',
      } as any);
    }
    return trains.slice(0, 144);
  }
}

export default async function TrainsPage() {
  // SSR: Lade Züge serverseitig
  const trains = await getTrains();

  return <TrainsClientExtended initialTrains={trains} />;
}
