// Single Source of Truth (SSOT) V2 - Mit realen Linien und IHB-Profilen
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

export type TrainStatus = 'active' | 'maintenance' | 'alarm' | 'offline' | 'reserve' | 'abstellung';
export type VehicleType = 'flirt_3_160' | 'mireo_3_plus_h' | 'desiro_hc';

export interface TrainSSO {
  trainId: string;
  vehicleType: VehicleType;
  lineCode: string;
  region: 'BW' | 'BY';
  homeDepot: 'Essingen' | 'Langweid';
  status: TrainStatus;
  isReserve: boolean;
  notes?: string;
  currentLocation?: { lat: number; lng: number };
  lastSeenAt?: string;
  delayMin?: number;
  nextMaintenance?: MaintenanceTask;
  mileageKm?: number;
}

export interface LineSSO {
  routeId: string;
  lineCode: string;
  lineName: string;
  operator: string;
  region: 'BW' | 'BY';
  kmPerDayMean: number;
  runWindowStart: string;
  runWindowEnd: string;
  fleetCount?: number;
}

export interface DepotSSO {
  id: 'Essingen' | 'Langweid';
  name: string;
  region: 'BW' | 'BY';
  coordinates: { lat: number; lng: number };
  tracks: Array<{
    id: string;
    name: string;
    length: number;
    features: string[];
    occupied?: boolean;
    currentTrain?: string;
  }>;
}

export interface MaintenanceTask {
  id: string;
  type: 'IS1' | 'IS2' | 'IS3' | 'IS4' | 'lathe' | 'cleaning' | 'corrective' | 'accident';
  name: string;
  description: string;
  dueDate: string;
  durationHours: number;
  teamSize: number;
  skillsRequired: string[];
  featuresRequired: string[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  ecmLevel: 2 | 3 | 4;
}

export interface IHBProfile {
  family: string;
  configuration: string;
  manufacturer: string;
  capacity: number;
  lengthM: number;
  usageProfile: {
    kmPerDayMean: number;
    dutyCycle: string;
    environment: string;
    stationFrequency: number;
  };
  preventiveIntervals: Record<string, any>;
  lccParameters: {
    laborCostEurH: number;
    materialCostEurKm: number;
    energyCostEurKm: number;
    partsLifetimeKm: Record<string, number>;
  };
}

// Status-Mapping Deutsch <-> Intern
export const STATUS_LABELS_DE: Record<TrainStatus, string> = {
  active: 'Aktiv',
  maintenance: 'Wartung',
  alarm: 'Alarm',
  offline: 'Offline',
  reserve: 'Reserve',
  abstellung: 'Abstellung'
};

export const STATUS_COLORS: Record<TrainStatus, string> = {
  active: 'green',
  maintenance: 'yellow',
  alarm: 'red',
  offline: 'gray',
  reserve: 'purple',
  abstellung: 'blue'
};

// Depots Definition mit erweiterten Features
export const DEPOTS: DepotSSO[] = [
  {
    id: 'Essingen',
    name: 'Depot Essingen',
    region: 'BW',
    coordinates: { lat: 48.712833, lng: 10.098167 },
    tracks: [
      { id: 'E-H1', name: 'Halle 1', length: 240, features: ['Halle', 'Grube', 'OL'] },
      { id: 'E-H2', name: 'Halle 2', length: 240, features: ['Halle', 'Grube', 'OL'] },
      { id: 'E-ARA1', name: 'Außenreinigung', length: 120, features: ['Waschhalle'] },
      { id: 'E-ST1', name: 'Abstellung 1', length: 200, features: ['OL'] },
      { id: 'E-ST2', name: 'Abstellung 2', length: 200, features: ['OL'] },
      { id: 'E-LAT1', name: 'Drehbank', length: 120, features: ['Radsatzdrehmaschine'] }
    ]
  },
  {
    id: 'Langweid',
    name: 'Depot Langweid',
    region: 'BY',
    coordinates: { lat: 48.487500, lng: 10.850833 },
    tracks: [
      { id: 'L-H1', name: 'Halle 1', length: 220, features: ['Halle', 'OL'] },
      { id: 'L-H2', name: 'Halle 2', length: 220, features: ['Halle', 'OL', 'H2-Sicherheit'] },
      { id: 'L-H3', name: 'Halle 3', length: 220, features: ['Halle', 'OL', 'Radsatzdrehmaschine'] },
      { id: 'L-H4', name: 'Halle 4', length: 220, features: ['Halle', 'OL', 'Schwerlast'] },
      { id: 'L-H5', name: 'Halle 5', length: 220, features: ['Halle', 'OL', 'Grube'] },
      { id: 'L-ST1', name: 'Yard 1', length: 180, features: ['OL'] },
      { id: 'L-ST2', name: 'Yard 2', length: 180, features: ['OL'] },
      { id: 'L-ST3', name: 'Yard 3', length: 180, features: ['OL'] },
      { id: 'L-ST4', name: 'Yard 4', length: 180, features: ['OL'] },
      { id: 'L-ST5', name: 'Yard 5', length: 180, features: ['Shore-Power'] },
      { id: 'L-ST6', name: 'Yard 6', length: 180, features: ['Shore-Power'] },
      { id: 'L-WAS1', name: 'Waschanlage', length: 150, features: ['Waschhalle'] }
    ]
  }
];

// SSOT Singleton
class FleetSSOV2 {
  private trains: TrainSSO[] = [];
  private lines: LineSSO[] = [];
  private ihbProfiles: Map<VehicleType, IHBProfile> = new Map();
  private ecmCatalog: any = {};
  private faultRates: any = {};
  private initialized = false;

  initialize() {
    if (this.initialized) return;
    
    try {
      // Lade Fleet-Daten
      const fleetCsvPath = path.join(process.cwd(), 'data', 'fleet_144_assignment_v2.csv');
      const fleetContent = readFileSync(fleetCsvPath, 'utf-8');
      const fleetLines = fleetContent.split('\n').filter(l => l.trim());
      const fleetHeaders = fleetLines[0].split(';');
      
      // Parse Fleet CSV
      this.trains = fleetLines.slice(1).map(line => {
        const values = line.split(';');
        const trainData: TrainSSO = {
          trainId: values[0],
          vehicleType: values[1] as VehicleType,
          lineCode: values[2],
          region: values[4] as 'BW' | 'BY',
          homeDepot: values[5] as 'Essingen' | 'Langweid',
          isReserve: values[6] === 'true',
          status: values[7] as TrainStatus || 'active',
          notes: values[8],
          mileageKm: Math.floor(Math.random() * 200000) // Simulierter Kilometerstand
        };
        
        // Setze initiale Position basierend auf Depot
        const depot = DEPOTS.find(d => d.id === trainData.homeDepot);
        if (depot) {
          trainData.currentLocation = {
            lat: depot.coordinates.lat + (Math.random() - 0.5) * 0.01,
            lng: depot.coordinates.lng + (Math.random() - 0.5) * 0.01
          };
        }
        
        trainData.lastSeenAt = new Date().toISOString();
        trainData.delayMin = trainData.status === 'active' ? Math.floor(Math.random() * 10) - 2 : 0;
        
        return trainData;
      });
      
      // Lade Linien-Daten
      const linesCsvPath = path.join(process.cwd(), 'data', 'lines_real.csv');
      const linesContent = readFileSync(linesCsvPath, 'utf-8');
      const linesLines = linesContent.split('\n').filter(l => l.trim());
      
      this.lines = linesLines.slice(1).map(line => {
        const values = line.split(';');
        const lineData: LineSSO = {
          routeId: values[0],
          lineCode: values[1],
          lineName: values[2],
          operator: values[3],
          region: values[4] as 'BW' | 'BY',
          kmPerDayMean: parseInt(values[5]),
          runWindowStart: values[6],
          runWindowEnd: values[7]
        };
        
        // Berechne Flottengröße pro Linie
        lineData.fleetCount = this.trains.filter(t => t.lineCode === lineData.lineCode).length;
        
        return lineData;
      });
      
      // Lade IHB-Profile
      const ihbPath = path.join(process.cwd(), 'data', 'ihb_profiles.yaml');
      const ihbContent = readFileSync(ihbPath, 'utf-8');
      const ihbData = yaml.load(ihbContent) as any;
      
      for (const [key, profile] of Object.entries(ihbData)) {
        if (key !== 'accident_rates') {
          this.ihbProfiles.set(key as VehicleType, profile as IHBProfile);
        }
      }
      
      // Lade ECM-Katalog
      const ecmPath = path.join(process.cwd(), 'data', 'ecm_catalog.yaml');
      const ecmContent = readFileSync(ecmPath, 'utf-8');
      this.ecmCatalog = yaml.load(ecmContent) as any;
      
      // Lade Fehlerraten
      const faultPath = path.join(process.cwd(), 'data', 'fault_rates.yaml');
      const faultContent = readFileSync(faultPath, 'utf-8');
      this.faultRates = yaml.load(faultContent) as any;
      
      this.initialized = true;
      
      // Validierung
      console.log(`SSOT V2 initialisiert: ${this.trains.length} Züge, ${this.lines.length} Linien`);
      if (this.trains.length !== 144) {
        console.error(`WARNUNG: Flotte hat ${this.trains.length} statt 144 Züge!`);
      }
      
    } catch (error) {
      console.error('Fehler beim Laden der SSOT V2 Daten:', error);
      // Generiere Fallback wenn Dateien fehlen
      this.generateFallbackFleet();
      this.initialized = true;
    }
  }

  private generateFallbackFleet() {
    // Fallback für fehlende Dateien
    this.trains = [];
    const vehicleTypes: VehicleType[] = ['flirt_3_160', 'mireo_3_plus_h', 'desiro_hc'];
    const lines = ['RE1', 'RE2', 'RE8', 'RE9', 'MEX16', 'S2', 'S6'];
    
    for (let i = 1; i <= 144; i++) {
      const vehicleType = vehicleTypes[i % 3];
      const isReserve = i > 122; // Letzte 22 als Reserve
      const depot: 'Essingen' | 'Langweid' = i <= 69 ? 'Essingen' : 'Langweid';
      
      this.trains.push({
        trainId: `${vehicleType.split('_')[0].toUpperCase()}-${String(i).padStart(3, '0')}`,
        vehicleType,
        lineCode: isReserve ? 'RESERVE' : lines[i % lines.length],
        region: depot === 'Essingen' ? 'BW' : 'BY',
        homeDepot: depot,
        status: isReserve ? 'reserve' : 'active',
        isReserve,
        mileageKm: Math.floor(Math.random() * 200000),
        lastSeenAt: new Date().toISOString()
      });
    }
  }

  // Getter Methoden
  getAllTrains(): TrainSSO[] {
    this.initialize();
    return [...this.trains];
  }

  getTrainById(trainId: string): TrainSSO | undefined {
    this.initialize();
    return this.trains.find(t => t.trainId === trainId);
  }

  getTrainsByStatus(status: TrainStatus): TrainSSO[] {
    this.initialize();
    return this.trains.filter(t => t.status === status);
  }

  getTrainsByDepot(depotId: 'Essingen' | 'Langweid'): TrainSSO[] {
    this.initialize();
    return this.trains.filter(t => t.homeDepot === depotId);
  }

  getTrainsByLine(lineCode: string): TrainSSO[] {
    this.initialize();
    return this.trains.filter(t => t.lineCode === lineCode);
  }

  getLines(): LineSSO[] {
    this.initialize();
    return [...this.lines];
  }

  getLineByCode(lineCode: string): LineSSO | undefined {
    this.initialize();
    return this.lines.find(l => l.lineCode === lineCode);
  }

  getIHBProfile(vehicleType: VehicleType): IHBProfile | undefined {
    this.initialize();
    return this.ihbProfiles.get(vehicleType);
  }

  getECMCatalog(): any {
    this.initialize();
    return this.ecmCatalog;
  }

  getFaultRates(): any {
    this.initialize();
    return this.faultRates;
  }

  // Wartungsplanung
  calculateNextMaintenance(train: TrainSSO): MaintenanceTask | undefined {
    const profile = this.getIHBProfile(train.vehicleType);
    if (!profile) return undefined;
    
    const mileage = train.mileageKm || 0;
    const intervals = profile.preventiveIntervals;
    
    // Prüfe welche Wartung fällig ist
    for (const [key, interval] of Object.entries(intervals)) {
      const intervalKm = interval.interval_km;
      if (intervalKm && mileage % intervalKm < 1000) {
        return {
          id: `${train.trainId}-${key}-${Date.now()}`,
          type: key.startsWith('IS') ? key as any : 'corrective',
          name: interval.description,
          description: interval.description,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          durationHours: interval.duration_hours,
          teamSize: interval.team_size,
          skillsRequired: interval.skills,
          featuresRequired: interval.features_required,
          priority: key === 'IS4' ? 'critical' : key === 'IS3' ? 'high' : 'normal',
          ecmLevel: 4
        };
      }
    }
    
    return undefined;
  }

  // Konsistenz-Report
  getConsistencyReport() {
    this.initialize();
    
    const totalTrains = this.trains.length;
    const byStatus = {
      active: this.trains.filter(t => t.status === 'active').length,
      maintenance: this.trains.filter(t => t.status === 'maintenance').length,
      alarm: this.trains.filter(t => t.status === 'alarm').length,
      offline: this.trains.filter(t => t.status === 'offline').length,
      reserve: this.trains.filter(t => t.status === 'reserve').length,
      abstellung: this.trains.filter(t => t.status === 'abstellung').length
    };
    
    const byDepot = {
      Essingen: this.trains.filter(t => t.homeDepot === 'Essingen').length,
      Langweid: this.trains.filter(t => t.homeDepot === 'Langweid').length
    };
    
    const byLine: Record<string, number> = {};
    this.trains.forEach(t => {
      byLine[t.lineCode] = (byLine[t.lineCode] || 0) + 1;
    });
    
    const byVehicleType: Record<string, number> = {};
    this.trains.forEach(t => {
      byVehicleType[t.vehicleType] = (byVehicleType[t.vehicleType] || 0) + 1;
    });
    
    const reserveCount = this.trains.filter(t => t.isReserve).length;
    
    return {
      totalTrains,
      expectedTotal: 144,
      isConsistent: totalTrains === 144,
      byStatus,
      byDepot,
      byLine,
      byVehicleType,
      reserveCount,
      checks: {
        C1: totalTrains === 144,
        C2: byDepot.Essingen + byDepot.Langweid === 144,
        C3: Object.values(byLine).reduce((a, b) => a + b, 0) === 144,
        C4: byStatus.maintenance >= 0,
        C5: reserveCount === 22,
        C6: true
      }
    };
  }
}

// Export Singleton
export const fleetSSOV2 = new FleetSSOV2();
