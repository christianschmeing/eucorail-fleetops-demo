export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  code: string;
  system: string;
  severity: AlertSeverity;
  message: string;
  action?: string;
  ts: number;
}

const CATALOG: Array<Omit<Alert, 'ts'>> = [
  {
    code: 'HVAC_001',
    system: 'HVAC',
    severity: 'warning',
    message: 'Klimaanlage Wagen 3 – reduzierte Leistung',
    action: 'Wartung einplanen',
  },
  {
    code: 'BRAKE_001',
    system: 'Bremse',
    severity: 'info',
    message: 'Bremsbeläge bei 65% Verschleiß',
    action: 'Austausch bei nächster Inspektion',
  },
  { code: 'PIS_001', system: 'PIS', severity: 'info', message: 'Software-Update verfügbar' },
  {
    code: 'ETCS_001',
    system: 'ETCS',
    severity: 'error',
    message: 'Zugbeeinflussung meldet Störung',
    action: 'Reset und Diagnose',
  },
  {
    code: 'ENERGY_001',
    system: 'Energie',
    severity: 'warning',
    message: 'Überdurchschnittlicher Energieverbrauch',
    action: 'Fahrweise prüfen',
  },
  {
    code: 'DOOR_001',
    system: 'Türen',
    severity: 'error',
    message: 'Tür 2 meldet Blockade',
    action: 'Vor Abfahrt prüfen',
  },
  {
    code: 'WHEEL_001',
    system: 'Radsatz',
    severity: 'warning',
    message: 'Schlupfregistrierung erhöht',
    action: 'Profiltiefe prüfen',
  },
  {
    code: 'PANTO_001',
    system: 'Stromabnehmer',
    severity: 'warning',
    message: 'Kohleverschleiß erhöht',
    action: 'Baldiger Tausch erforderlich',
  },
  {
    code: 'CAB_001',
    system: 'Führerstand',
    severity: 'info',
    message: 'Fahrpult Kalibrierung empfohlen',
  },
  {
    code: 'NETWORK_001',
    system: 'Netzwerk',
    severity: 'warning',
    message: 'Verbindungsabbrüche Modem A',
  },
];

export class AlertGenerator {
  constructor(private seed = Date.now()) {}

  private rand() {
    // Mulberry32
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  maybeEmitAlert(probability = 0.05): Alert | null {
    if (this.rand() > probability) return null;
    const base = CATALOG[Math.floor(this.rand() * CATALOG.length)];
    return { ...base, ts: Date.now() };
  }

  listCatalog(): Array<Omit<Alert, 'ts'>> {
    return CATALOG;
  }
}
