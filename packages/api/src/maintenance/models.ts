export type MaintenanceLevel = 'IS100' | 'IS200' | 'IS300' | 'IS600';

export interface MaintenancePolicy {
  level: MaintenanceLevel;
  kmInterval: number; // kilometers between services
  dayInterval: number; // days between services (approx)
  notes?: string;
}

export interface UnitMaintenanceSpec {
  unitType: string;
  manufacturer: 'Siemens' | 'Stadler' | 'Other';
  policies: MaintenancePolicy[];
}

// NOTE: Values are approximate for simulation realism only – not operational guidance
export const UNIT_MAINTENANCE_SPECS: UnitMaintenanceSpec[] = [
  {
    unitType: 'MIREO',
    manufacturer: 'Siemens',
    policies: [
      { level: 'IS100', kmInterval: 10000, dayInterval: 30, notes: 'Kurzinspektion, Sicht-/Funktionsprüfung' },
      { level: 'IS200', kmInterval: 30000, dayInterval: 90, notes: 'Erweiterte Inspektion inkl. Systeme' },
      { level: 'IS300', kmInterval: 60000, dayInterval: 180, notes: 'Umfangreichere Prüfung inkl. Drehgestell-Sichtprüfung' },
      { level: 'IS600', kmInterval: 120000, dayInterval: 365, notes: 'Große Inspektion mit Komponentenwechsel nach Vorgaben' }
    ]
  },
  {
    unitType: 'DESIRO_HC',
    manufacturer: 'Siemens',
    policies: [
      { level: 'IS100', kmInterval: 15000, dayInterval: 45 },
      { level: 'IS200', kmInterval: 40000, dayInterval: 120 },
      { level: 'IS300', kmInterval: 80000, dayInterval: 240 },
      { level: 'IS600', kmInterval: 160000, dayInterval: 480 }
    ]
  },
  {
    unitType: 'FLIRT3',
    manufacturer: 'Stadler',
    policies: [
      { level: 'IS100', kmInterval: 12000, dayInterval: 30 },
      { level: 'IS200', kmInterval: 35000, dayInterval: 120 },
      { level: 'IS300', kmInterval: 70000, dayInterval: 240 },
      { level: 'IS600', kmInterval: 140000, dayInterval: 480 }
    ]
  }
];

export function getSpecForUnit(unitType: string): UnitMaintenanceSpec | undefined {
  return UNIT_MAINTENANCE_SPECS.find((s) => s.unitType === unitType);
}

export type FaultSeverity = 'info' | 'minor' | 'major' | 'critical';

export interface FaultCode {
  code: string;
  subsystem: 'doors' | 'HVAC' | 'ETCS' | 'brakes' | 'drive' | 'aux';
  severity: FaultSeverity;
  since: number; // epoch ms
  message: string;
}

export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDoorFaults(seed: number): FaultCode[] {
  const rnd = seededRandom(seed);
  const faults: FaultCode[] = [];
  const count = Math.floor(rnd() * 3); // 0..2
  for (let i = 0; i < count; i++) {
    const code = ['DOOR_17', 'DOOR_23', 'DOOR_42'][Math.floor(rnd() * 3)];
    const sev: FaultSeverity = rnd() < 0.1 ? 'critical' : rnd() < 0.4 ? 'major' : 'minor';
    faults.push({
      code,
      subsystem: 'doors',
      severity: sev,
      since: Date.now() - Math.floor(rnd() * 72) * 3600 * 1000,
      message: code === 'DOOR_23' ? 'Türe schließt nicht vollständig (Lichtschranke)' : code === 'DOOR_17' ? 'Türflügel blockiert' : 'Türsteuerung sporadische Störung'
    });
  }
  return faults;
}


