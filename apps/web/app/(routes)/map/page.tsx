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
    // Fallback für SSR - generiere 144 Beispiel-Züge mit allen 17 Linien
    const trains: Train[] = [];
    const linesBW = ['RE1', 'RE2', 'RE8', 'RB22', 'RB27'];
    const linesBY = ['RE9', 'RE12', 'MEX16', 'MEX18', 'MEX12', 'RB32', 'RB54'];
    const linesSBahn = ['S2', 'S3', 'S4', 'S6'];
    const allLines = [...linesBW, ...linesBY, ...linesSBahn, 'RESERVE'];
    const statuses = ['active', 'maintenance', 'standby', 'inspection', 'reserve'];
    
    for (let i = 0; i < 144; i++) {
      let line, region;
      if (i < 59) {
        // FLIRT in BW
        line = linesBW[i % linesBW.length];
        region = 'BW';
      } else if (i < 108) {
        // Mireo in BY
        line = linesBY[i % linesBY.length];
        region = 'BY';
      } else if (i < 122) {
        // Desiro S-Bahn
        line = linesSBahn[i % linesSBahn.length];
        region = 'BY';
      } else {
        // Reserve
        line = 'RESERVE';
        region = i % 2 === 0 ? 'BW' : 'BY';
      }
      
      // Bestimme Status
      const status = i < 108 ? 'active' : i < 120 ? 'maintenance' : i < 122 ? 'inspection' : 'reserve';
      
      // Bestimme Position - auch Reserve-Züge haben Positionen (in Depots)
      let position;
      if (i >= 122) {
        // Reserve-Züge sind in Depots
        position = region === 'BW' ? 
          { lat: 48.6295, lng: 9.9574 } :  // Essingen
          { lat: 48.4894, lng: 10.8539 };  // Langweid
      } else if (status === 'maintenance') {
        // Wartungszüge auch in Depots
        position = region === 'BW' ? 
          { lat: 48.6295 + Math.random() * 0.01, lng: 9.9574 + Math.random() * 0.01 } :
          { lat: 48.4894 + Math.random() * 0.01, lng: 10.8539 + Math.random() * 0.01 };
      } else {
        // Aktive Züge auf der Strecke
        position = {
          lat: region === 'BW' ? 48.6 + Math.random() * 0.8 : 48.1 + Math.random() * 0.8,
          lng: region === 'BW' ? 9.5 + Math.random() * 1.5 : 11.0 + Math.random() * 1.5
        };
      }
      
      trains.push({
        id: `TRAIN-${String(i + 1).padStart(3, '0')}`,
        lineId: line,
        region: region,
        status: status,
        position: position,
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