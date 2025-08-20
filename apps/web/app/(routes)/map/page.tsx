import { apiGet } from '@/lib/api';
import arverioFleet from '@/data/arverio-fleet-real.json';
import MapClient from './MapClient';

interface Train {
  id: string;
  status: string;
  lineId: string;
  region: string;
  position?: { lat: number; lng: number };
  delayMin?: number;
}

async function getTrains(): Promise<Train[]> {
  // PRIMARY: Arverio Real‑Daten
  const real = (arverioFleet as any).vehicles as Array<any>;
  if (real && real.length) {
    const mapTrain = (v: any): Train => ({
      id: v.id,
      lineId: v.line || (v.depot === 'ESS' ? 'RE1' : 'RE9'),
      region: v.depot === 'ESS' ? 'BW' : 'BY',
      status:
        v.status === 'MAINTENANCE' ? 'maintenance' : v.status === 'DEPOT' ? 'standby' : 'active',
      position: v.position
        ? { lat: v.position.lat, lng: v.position.lon }
        : v.depot === 'ESS'
          ? { lat: 48.6295, lng: 9.9574 }
          : { lat: 48.4894, lng: 10.8539 },
      delayMin: 0,
    });
    const trains = real.map(mapTrain);
    while (trains.length < 144) {
      const isBW = trains.length % 2 === 0;
      trains.push({
        id: `RES-${String(90000 + trains.length).padStart(5, '0')}`,
        lineId: 'RESERVE',
        region: isBW ? 'BW' : 'BY',
        status: 'standby',
        position: isBW ? { lat: 48.6295, lng: 9.9574 } : { lat: 48.4894, lng: 10.8539 },
        delayMin: 0,
      });
    }
    return trains.slice(0, 144);
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
