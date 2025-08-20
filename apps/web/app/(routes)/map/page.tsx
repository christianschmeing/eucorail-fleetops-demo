import { apiGet } from '@/lib/api';
import arverioFleet from '@/data/arverio-fleet-real.json';
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
  const stations = LINES_BY_ID[lineId] || [];
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

async function getTrains(): Promise<Train[]> {
  // PRIMARY: Arverio Real‑Daten
  const real = (arverioFleet as any).vehicles as Array<any>;
  if (real && real.length) {
    const mapTrain = (v: any): Train => {
      const region = v.depot === 'ESS' ? 'BW' : 'BY';
      const fallbackLine =
        region === 'BW'
          ? ['RE1', 'RE8', 'MEX16'][Math.floor(Math.random() * 3)]
          : ['RE9', 'RE80'][Math.floor(Math.random() * 2)];
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
