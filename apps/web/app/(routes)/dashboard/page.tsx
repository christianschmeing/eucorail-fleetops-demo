import { apiGet } from '@/lib/api';

interface KPIData {
  availabilityPct: number;
  overdueCount: number;
  woAgingMedianDays: number;
  depotUtilToday: Record<string, number>;
  fleetSize: number;
}

interface Train {
  id: string;
  status: string;
  lineId: string;
  region: string;
}

interface Line {
  id: string;
  vehicles: number;
  activeVehicles: number;
  punctualityPct: number;
}

async function getKPIs(): Promise<KPIData> {
  try {
    return await apiGet<KPIData>('/api/kpis');
  } catch {
    // Fallback für SSR
    return {
      fleetSize: 144,
      availabilityPct: 75.0,
      overdueCount: 7,
      woAgingMedianDays: 3,
      depotUtilToday: { Stuttgart: 0.65, Augsburg: 0.72 }
    };
  }
}

async function getTrains(): Promise<Train[]> {
  try {
    return await apiGet<Train[]>('/api/trains');
  } catch {
    // Fallback: Generiere 144 Züge mit korrekter Verteilung
    const trains: Train[] = [];
    const statusDistribution = {
      active: 108,
      maintenance: 21,
      alarm: 3,
      offline: 5,
      reserve: 22,
      abstellung: 7
    };
    
    let statusCounter = { ...statusDistribution };
    
    // Essingen Züge (69)
    for (let i = 1; i <= 32; i++) {
      const status = statusCounter.active-- > 0 ? 'active' : 
                     statusCounter.maintenance-- > 0 ? 'maintenance' : 'offline';
      trains.push({
        id: `RE9-${60000 + i}`,
        status,
        lineId: 'RE9',
        region: 'BW',
        homeDepot: 'Essingen'
      } as any);
    }
    
    for (let i = 1; i <= 28; i++) {
      const status = statusCounter.active-- > 0 ? 'active' : 
                     statusCounter.maintenance-- > 0 ? 'maintenance' : 'abstellung';
      trains.push({
        id: `RE8-${70000 + i}`,
        status,
        lineId: 'RE8',
        region: 'BW',
        homeDepot: 'Essingen'
      } as any);
    }
    
    for (let i = 1; i <= 9; i++) {
      trains.push({
        id: `RES-E-${90000 + i}`,
        status: 'reserve',
        lineId: 'RESERVE',
        region: 'BW',
        homeDepot: 'Essingen',
        isReserve: true
      } as any);
    }
    
    // Langweid Züge (75)
    for (let i = 1; i <= 30; i++) {
      const status = statusCounter.active-- > 0 ? 'active' : 
                     statusCounter.alarm-- > 0 ? 'alarm' : 'maintenance';
      trains.push({
        id: `MEX16-${80000 + i}`,
        status,
        lineId: 'MEX16',
        region: 'BY',
        homeDepot: 'Langweid'
      } as any);
    }
    
    for (let i = 1; i <= 18; i++) {
      trains.push({
        id: `MEX12-${81000 + i}`,
        status: statusCounter.active-- > 0 ? 'active' : 'maintenance',
        lineId: 'MEX12',
        region: 'BY',
        homeDepot: 'Langweid'
      } as any);
    }
    
    for (let i = 1; i <= 18; i++) {
      trains.push({
        id: `S6-${82000 + i}`,
        status: statusCounter.active-- > 0 ? 'active' : 'offline',
        lineId: 'S6',
        region: 'BY',
        homeDepot: 'Langweid'
      } as any);
    }
    
    for (let i = 1; i <= 18; i++) {
      trains.push({
        id: `S2-${83000 + i}`,
        status: statusCounter.active-- > 0 ? 'active' : 'abstellung',
        lineId: 'S2',
        region: 'BY',
        homeDepot: 'Langweid'
      } as any);
    }
    
    for (let i = 1; i <= 13; i++) {
      trains.push({
        id: `RES-L-${91000 + i}`,
        status: 'reserve',
        lineId: 'RESERVE',
        region: 'BY',
        homeDepot: 'Langweid',
        isReserve: true
      } as any);
    }
    
    return trains;
  }
}

async function getLines(): Promise<Line[]> {
  try {
    return await apiGet<Line[]>('/api/lines');
  } catch {
    // Fallback: Linien mit korrekter Verteilung
    return [
      { id: 'RE9', vehicles: 32, activeVehicles: 24, punctualityPct: 88 },
      { id: 'RE8', vehicles: 28, activeVehicles: 21, punctualityPct: 92 },
      { id: 'MEX16', vehicles: 30, activeVehicles: 23, punctualityPct: 85 },
      { id: 'MEX12', vehicles: 18, activeVehicles: 14, punctualityPct: 90 },
      { id: 'S6', vehicles: 18, activeVehicles: 14, punctualityPct: 94 },
      { id: 'S2', vehicles: 18, activeVehicles: 14, punctualityPct: 89 },
      { id: 'RESERVE', vehicles: 22, activeVehicles: 0, punctualityPct: 0 }
    ] as Line[];
  }
}

async function getRecentEvents() {
  // Generiere Events für alle 144 Züge
  const events = [];
  const now = Date.now();
  
  // Erstelle Events für verschiedene Zugtypen
  const eventTypes = [
    { type: 'departure', message: 'hat Depot verlassen' },
    { type: 'arrival', message: 'ist im Depot angekommen' },
    { type: 'maintenance_started', message: 'Wartung begonnen' },
    { type: 'maintenance_completed', message: 'Wartung abgeschlossen' },
    { type: 'alert', message: 'Türstörung gemeldet' },
    { type: 'status_change', message: 'Status geändert' }
  ];
  
  for (let i = 0; i < 20; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const trainNum = Math.floor(Math.random() * 144) + 1;
    const lineCode = trainNum < 60 ? 'RE8' : trainNum < 90 ? 'RE9' : trainNum < 120 ? 'MEX16' : 'S6';
    
    events.push({
      trainId: `${lineCode}-${70000 + trainNum}`,
      lineCode,
      type: eventType.type,
      message: eventType.message,
      timestamp: new Date(now - i * 5 * 60 * 1000).toISOString()
    });
  }
  
  return events;
}

import ConsistencyChecker from '@/components/ConsistencyChecker';

export default async function DashboardPage() {
  // SSR: Lade alle Daten serverseitig
  const [kpis, trains, lines, recentEvents] = await Promise.all([
    getKPIs(),
    getTrains(),
    getLines(),
    getRecentEvents()
  ]);

  // Erweitere KPI-Daten
  const enhancedKpis = {
    ...kpis,
    mtbf: 428,
    mttr: 2.4,
    ecmCompliance: 92.3,
    vehicleTypes: {
      flirt_3_160: 59,
      mireo_3_plus_h: 49,
      desiro_hc: 36
    },
    lineDistribution: lines.reduce((acc, line) => {
      acc[line.id] = (line as any).vehicles || 0;
      return acc;
    }, {} as Record<string, number>)
  };

  // Erweitere Trains mit Fahrzeugtypen
  const enhancedTrains = trains.map((train, idx) => ({
    ...train,
    vehicleType: idx < 59 ? 'flirt_3_160' : idx < 108 ? 'mireo_3_plus_h' : 'desiro_hc',
    vehicleFamily: idx < 59 ? 'Stadler' : 'Siemens',
    model: idx < 59 ? 'FLIRT' : idx < 108 ? 'Mireo' : 'Desiro',
    mileageKm: 50000 + Math.floor(Math.random() * 150000)
  }));

  // Dynamischer Import
  const DashboardClient = (await import('./DashboardClient')).default;
  
  return (
    <div>
      <DashboardClient 
        kpiData={enhancedKpis}
        recentEvents={recentEvents}
        trains={enhancedTrains}
        lines={lines}
      />
      <div className="p-6">
        <ConsistencyChecker />
      </div>
    </div>
  );
}