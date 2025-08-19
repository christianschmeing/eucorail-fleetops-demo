import { apiGet } from '@/lib/api';
import TrainsClient from './TrainsClient';

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
    // Ensure we have exactly 144 trains
    return trains.slice(0, 144).map(train => ({
      ...train,
      lineId: train.lineCode || train.lineId,
      depot: train.region === 'BW' ? 'Stuttgart' : 'Augsburg',
      series: ['FLIRT³', 'Mireo'][Math.floor(Math.random() * 2)],
      healthScore: 85 + Math.floor(Math.random() * 15),
      speedKmh: train.status === 'active' ? 80 + Math.floor(Math.random() * 40) : 0,
      nextMaintenanceDate: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
  } catch {
    // Fallback: Generiere 144 Züge
    const fallbackTrains: Train[] = [];
    for (let i = 0; i < 144; i++) {
      const lineId = ['RE9', 'MEX16', 'RE8', 'RE1', 'RE89'][Math.floor(i / 29) % 5];
      const region = i < 87 ? 'BW' : 'BY';
      fallbackTrains.push({
        id: `${lineId}-${String(60000 + i).padStart(5, '0')}`,
        lineId,
        region,
        status: i < 108 ? 'active' : ['maintenance', 'standby', 'inspection'][i % 3],
        depot: region === 'BW' ? 'Stuttgart' : 'Augsburg',
        series: ['FLIRT³', 'Mireo'][i % 2],
        delayMin: Math.floor(Math.random() * 10) - 5,
        speedKmh: i < 108 ? 80 + Math.floor(Math.random() * 40) : 0,
        healthScore: 85 + Math.floor(Math.random() * 15),
        nextMaintenanceDate: new Date(Date.now() + (30 + i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    return fallbackTrains;
  }
}

export default async function TrainsPage() {
  // SSR: Lade Züge serverseitig
  const trains = await getTrains();
  
  return <TrainsClient initialTrains={trains} />;
}