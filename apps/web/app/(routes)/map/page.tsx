import { apiGet } from '@/lib/api';
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
  try {
    return await apiGet<Train[]>('/api/trains');
  } catch {
    // Fallback für SSR - generiere 144 Beispiel-Züge
    const trains: Train[] = [];
    const lines = ['RE9', 'MEX16', 'RE8', 'RE1', 'RE89'];
    const regions = ['BW', 'BY'];
    const statuses = ['active', 'maintenance', 'standby', 'inspection'];
    
    for (let i = 0; i < 144; i++) {
      trains.push({
        id: `TRAIN-${String(i + 1).padStart(3, '0')}`,
        lineId: lines[i % lines.length],
        region: regions[i % 2],
        status: i < 108 ? 'active' : statuses[1 + (i % 3)],
        position: i < 108 ? {
          lat: 48.0 + Math.random() * 2,
          lng: 9.0 + Math.random() * 3
        } : undefined,
        delayMin: Math.floor(Math.random() * 10) - 5
      });
    }
    return trains;
  }
}

export default async function MapPage() {
  // SSR: Lade Züge serverseitig
  const trains = await getTrains();
  
  // Berechne initiale KPIs
  const statusCounts = trains.reduce((acc, train) => {
    const status = train.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const initialKpis = {
    total: trains.length,
    active: statusCounts.active || 0,
    maintenance: statusCounts.maintenance || 0,
    alarm: (statusCounts.alarm || 0) + (statusCounts.inspection || 0),
    offline: (statusCounts.offline || 0) + (statusCounts.standby || 0)
  };

  return <MapClient initialTrains={trains} initialKpis={initialKpis} />;
}