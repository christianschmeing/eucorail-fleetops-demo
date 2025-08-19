import MaintenanceClient from './MaintenanceClient';

interface WorkOrder {
  id: string;
  trainId: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: string;
  assignedTo: string;
}

interface DepotCapacity {
  depot: string;
  date: string;
  totalSlots: number;
  usedSlots: number;
  plannedTrains: number;
}

interface RiskPart {
  partId: string;
  partName: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  affectedTrains: string[];
  lastIncident: string;
}

// Generate maintenance data for 144 trains
function generateMaintenanceData() {
  const workOrders: WorkOrder[] = [];
  const depotCapacity: DepotCapacity[] = [];
  const riskParts: RiskPart[] = [];
  
  // Generate work orders for some trains
  const priorities: ('HIGH' | 'MEDIUM' | 'LOW')[] = ['HIGH', 'MEDIUM', 'LOW'];
  const statuses: ('OPEN' | 'IN_PROGRESS' | 'COMPLETED')[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED'];
  const titles = [
    'Bremsenwartung',
    'Softwareupdate',
    'Türmechanik prüfen',
    'Klimaanlage warten',
    'Sicherheitscheck',
    'Radsatzwechsel',
    'Kupplungswartung',
    'Elektrische Prüfung'
  ];
  const technicians = ['Schmidt, M.', 'Müller, K.', 'Weber, T.', 'Wagner, S.', 'Becker, L.'];
  
  // Generate ~30 work orders
  for (let i = 0; i < 30; i++) {
    const lineId = ['RE9', 'MEX16', 'RE8', 'RE1', 'RE89'][Math.floor(i / 6) % 5];
    const trainId = `${lineId}-${String(60000 + i * 5).padStart(5, '0')}`;
    const daysOffset = Math.floor(Math.random() * 14) - 7; // -7 to +7 days
    
    workOrders.push({
      id: `WO-${String(1000 + i).padStart(4, '0')}`,
      trainId,
      title: titles[i % titles.length],
      priority: priorities[i % 3],
      status: i < 10 ? 'OPEN' : statuses[i % 3],
      dueDate: new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignedTo: technicians[i % technicians.length]
    });
  }
  
  // Generate depot capacity for next 14 days - Verwende reale Depots
  const depots = ['Essingen', 'Langweid'];
  for (let depot of depots) {
    for (let day = 0; day < 14; day++) {
      const date = new Date(Date.now() + day * 24 * 60 * 60 * 1000);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const totalSlots = isWeekend ? 10 : 20;
      const usedSlots = Math.floor(totalSlots * (0.5 + Math.random() * 0.4));
      const plannedTrains = Math.floor(usedSlots * 1.2);
      
      depotCapacity.push({
        depot,
        date: date.toISOString().split('T')[0],
        totalSlots,
        usedSlots,
        plannedTrains
      });
    }
  }
  
  // Generate risk parts
  const parts = [
    { id: 'BRK-001', name: 'Bremsbeläge Typ A', risk: 'HIGH' as const, affected: 25 },
    { id: 'MOT-002', name: 'Traktionsmotor Serie 2', risk: 'MEDIUM' as const, affected: 18 },
    { id: 'CMP-003', name: 'Kompressor K200', risk: 'HIGH' as const, affected: 12 },
    { id: 'BAT-004', name: 'Batteriemodul BM-5', risk: 'LOW' as const, affected: 8 },
    { id: 'SEN-005', name: 'Temperatursensor TS-3', risk: 'MEDIUM' as const, affected: 15 },
    { id: 'VLV-006', name: 'Pneumatikventil PV-7', risk: 'HIGH' as const, affected: 20 },
    { id: 'BRG-007', name: 'Radlager RL-400', risk: 'MEDIUM' as const, affected: 10 },
    { id: 'FLT-008', name: 'Luftfilter LF-9', risk: 'LOW' as const, affected: 35 }
  ];
  
  for (let part of parts) {
    const affectedTrains: string[] = [];
    for (let i = 0; i < part.affected; i++) {
      const lineId = ['RE9', 'MEX16', 'RE8', 'RE1', 'RE89'][Math.floor(Math.random() * 5)];
      affectedTrains.push(`${lineId}-${String(60000 + Math.floor(Math.random() * 144)).padStart(5, '0')}`);
    }
    
    riskParts.push({
      partId: part.id,
      partName: part.name,
      riskLevel: part.risk,
      affectedTrains,
      lastIncident: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }
  
  return { workOrders, depotCapacity, riskParts };
}

export default async function MaintenancePage() {
  // SSR: Generate maintenance data server-side with ECM integration
  const { workOrders, depotCapacity, riskParts } = generateMaintenanceData();
  const fleetSize = 144;
  
  // Ergänze Work Orders mit ECM-Levels und Fahrzeugtypen
  const enrichedWorkOrders = workOrders.map((wo, idx) => ({
    ...wo,
    ecmLevel: (wo.priority === 'HIGH' ? 2 : wo.priority === 'LOW' ? 4 : 3) as 2 | 3 | 4,
    vehicleType: idx < 50 ? 'flirt_3_160' : idx < 90 ? 'mireo_3_plus_h' : 'desiro_hc',
    type: idx % 7 === 0 ? 'IS4' : idx % 5 === 0 ? 'IS3' : idx % 3 === 0 ? 'IS2' : 
          idx % 2 === 0 ? 'corrective' : 'IS1' as any,
    estimatedDuration: idx % 7 === 0 ? 48 : idx % 5 === 0 ? 12 : idx % 3 === 0 ? 4 : 2,
    skillsRequired: ['Mechanik', 'Elektrik'],
    featuresRequired: idx % 7 === 0 ? ['Halle', 'Grube', 'OL'] : ['Grube']
  }));
  
  // Fahrzeugtyp-Verteilung
  const vehicleTypes = {
    flirt_3_160: 59,
    mireo_3_plus_h: 49,
    desiro_hc: 36
  };
  
  // Dynamischer Import für Client Component
  const ECMMaintenanceClient = (await import('./ECMMaintenanceClient')).default;
  
  return (
    <ECMMaintenanceClient 
      workOrders={enrichedWorkOrders}
      depotCapacity={depotCapacity}
      riskParts={riskParts}
      fleetSize={fleetSize}
      vehicleTypes={vehicleTypes}
    />
  );
}