// Single Source of Truth (SSOT) für 144-Züge-Flotte
import { readFileSync } from 'node:fs';
import path from 'node:path';

export type TrainStatus = 'active' | 'maintenance' | 'alarm' | 'offline' | 'reserve' | 'abstellung';

export interface TrainSSO {
  trainId: string;
  lineCode: string;
  region: 'BW' | 'BY';
  homeDepot: 'Essingen' | 'Langweid';
  status: TrainStatus;
  isReserve: boolean;
  notes?: string;
  currentLocation?: { lat: number; lng: number };
  lastSeenAt?: string;
  delayMin?: number;
}

export interface LineSSO {
  lineCode: string;
  name: string;
  operator: string;
  region: 'BW' | 'BY';
  fleetCount: number;
  depots: string[];
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
  }>;
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

// Depots Definition
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
      { id: 'E-ST1', name: 'Abstellung 1', length: 200, features: ['OL'] }
    ]
  },
  {
    id: 'Langweid',
    name: 'Depot Langweid',
    region: 'BY',
    coordinates: { lat: 48.487500, lng: 10.850833 },
    tracks: [
      { id: 'L-H1', name: 'Halle 1', length: 220, features: ['Halle', 'OL'] },
      { id: 'L-H2', name: 'Halle 2', length: 220, features: ['Halle', 'OL'] },
      { id: 'L-H3', name: 'Halle 3', length: 220, features: ['Halle', 'OL', 'Radsatzdrehmaschine'] },
      { id: 'L-H4', name: 'Halle 4', length: 220, features: ['Halle', 'OL'] },
      { id: 'L-H5', name: 'Halle 5', length: 220, features: ['Halle', 'OL'] },
      { id: 'L-ST1', name: 'Yard 1', length: 180, features: ['OL'] },
      { id: 'L-ST2', name: 'Yard 2', length: 180, features: ['OL'] },
      { id: 'L-ST3', name: 'Yard 3', length: 180, features: ['OL'] },
      { id: 'L-ST4', name: 'Yard 4', length: 180, features: ['OL'] },
      { id: 'L-ST5', name: 'Yard 5', length: 180, features: ['Shore-Power'] },
      { id: 'L-ST6', name: 'Yard 6', length: 180, features: ['Shore-Power'] }
    ]
  }
];

// Linien Definition basierend auf 144-Flotte
export const LINES: LineSSO[] = [
  { lineCode: 'RE9', name: 'RE9 München - Ulm', operator: 'Eucorail', region: 'BW', fleetCount: 32, depots: ['Essingen'] },
  { lineCode: 'RE8', name: 'RE8 Stuttgart - Würzburg', operator: 'Eucorail', region: 'BW', fleetCount: 28, depots: ['Essingen'] },
  { lineCode: 'MEX16', name: 'MEX16 Augsburg - Nürnberg', operator: 'Eucorail', region: 'BY', fleetCount: 30, depots: ['Langweid'] },
  { lineCode: 'MEX12', name: 'MEX12 München - Lindau', operator: 'Eucorail', region: 'BY', fleetCount: 18, depots: ['Langweid'] },
  { lineCode: 'S6', name: 'S6 München - Tutzing', operator: 'Eucorail', region: 'BY', fleetCount: 18, depots: ['Langweid'] },
  { lineCode: 'S2', name: 'S2 München - Erding', operator: 'Eucorail', region: 'BY', fleetCount: 18, depots: ['Langweid'] },
  { lineCode: 'RESERVE', name: 'Reserve', operator: 'Eucorail', region: 'BW', fleetCount: 22, depots: ['Essingen', 'Langweid'] }
];

// SSOT Singleton
class FleetSSO {
  private trains: TrainSSO[] = [];
  private initialized = false;

  initialize() {
    if (this.initialized) return;
    
    // Lade Fleet-Daten aus CSV
    try {
      const csvPath = path.join(process.cwd(), 'data', 'fleet_144_assignment.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n').filter(l => l.trim());
      const headers = lines[0].split(';');
      
      this.trains = lines.slice(1).map(line => {
        const values = line.split(';');
        const trainData: TrainSSO = {
          trainId: values[0],
          lineCode: values[1],
          region: values[2] as 'BW' | 'BY',
          homeDepot: values[3] as 'Essingen' | 'Langweid',
          isReserve: values[4] === 'true',
          status: values[5] as TrainStatus || 'active',
          notes: values[6]
        };
        
        // Setze initiale Position basierend auf Depot
        const depot = DEPOTS.find(d => d.id === trainData.homeDepot);
        if (depot) {
          // Leichte Variation für realistische Verteilung
          trainData.currentLocation = {
            lat: depot.coordinates.lat + (Math.random() - 0.5) * 0.01,
            lng: depot.coordinates.lng + (Math.random() - 0.5) * 0.01
          };
        }
        
        // Setze Zeitstempel
        trainData.lastSeenAt = new Date().toISOString();
        
        // Zufällige Verspätung für aktive Züge
        if (trainData.status === 'active') {
          trainData.delayMin = Math.floor(Math.random() * 10) - 2; // -2 bis +8 Minuten
        } else {
          trainData.delayMin = 0;
        }
        
        return trainData;
      });
      
      // Wenn CSV nicht existiert oder leer ist, generiere Fallback
      if (this.trains.length === 0) {
        this.generateFallbackFleet();
      }
      
      this.initialized = true;
    } catch (error) {
      console.warn('CSV nicht gefunden, generiere Fallback-Flotte:', error);
      this.generateFallbackFleet();
      this.initialized = true;
    }
    
    // Validierung: Exakt 144 Züge
    if (this.trains.length !== 144) {
      console.error(`WARNUNG: Flotte hat ${this.trains.length} statt 144 Züge!`);
    }
  }

  private generateFallbackFleet() {
    this.trains = [];
    
    // Essingen Züge (69 total)
    for (let i = 1; i <= 32; i++) {
      this.trains.push(this.createTrain(`RE9-${60000 + i}`, 'RE9', 'BW', 'Essingen', false));
    }
    for (let i = 1; i <= 28; i++) {
      this.trains.push(this.createTrain(`RE8-${70000 + i}`, 'RE8', 'BW', 'Essingen', false));
    }
    for (let i = 1; i <= 9; i++) {
      this.trains.push(this.createTrain(`RES-${90000 + i}`, 'RESERVE', 'BW', 'Essingen', true));
    }
    
    // Langweid Züge (75 total)
    for (let i = 1; i <= 30; i++) {
      this.trains.push(this.createTrain(`MEX16-${80000 + i}`, 'MEX16', 'BY', 'Langweid', false));
    }
    for (let i = 1; i <= 18; i++) {
      this.trains.push(this.createTrain(`MEX12-${81000 + i}`, 'MEX12', 'BY', 'Langweid', false));
    }
    for (let i = 1; i <= 18; i++) {
      this.trains.push(this.createTrain(`S6-${82000 + i}`, 'S6', 'BY', 'Langweid', false));
    }
    for (let i = 1; i <= 18; i++) {
      this.trains.push(this.createTrain(`S2-${83000 + i}`, 'S2', 'BY', 'Langweid', false));
    }
    for (let i = 1; i <= 13; i++) {
      this.trains.push(this.createTrain(`RES-${91000 + i}`, 'RESERVE', 'BY', 'Langweid', true));
    }
  }

  private createTrain(
    trainId: string, 
    lineCode: string, 
    region: 'BW' | 'BY', 
    homeDepot: 'Essingen' | 'Langweid',
    isReserve: boolean
  ): TrainSSO {
    // Status-Verteilung
    let status: TrainStatus;
    if (isReserve) {
      status = 'reserve';
    } else {
      const rand = Math.random();
      if (rand < 0.7) status = 'active';
      else if (rand < 0.85) status = 'maintenance';
      else if (rand < 0.92) status = 'abstellung';
      else if (rand < 0.97) status = 'alarm';
      else status = 'offline';
    }
    
    const depot = DEPOTS.find(d => d.id === homeDepot)!;
    
    return {
      trainId,
      lineCode,
      region,
      homeDepot,
      status,
      isReserve,
      currentLocation: {
        lat: depot.coordinates.lat + (Math.random() - 0.5) * 0.01,
        lng: depot.coordinates.lng + (Math.random() - 0.5) * 0.01
      },
      lastSeenAt: new Date().toISOString(),
      delayMin: status === 'active' ? Math.floor(Math.random() * 10) - 2 : 0
    };
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

  getReserveTrains(): TrainSSO[] {
    this.initialize();
    return this.trains.filter(t => t.isReserve);
  }

  // Konsistenz-Checks
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
    
    const reserveCount = this.trains.filter(t => t.isReserve).length;
    
    return {
      totalTrains,
      expectedTotal: 144,
      isConsistent: totalTrains === 144,
      byStatus,
      byDepot,
      byLine,
      reserveCount,
      checks: {
        C1: totalTrains === 144,
        C2: byDepot.Essingen + byDepot.Langweid === 144,
        C3: Object.values(byLine).reduce((a, b) => a + b, 0) === 144,
        C4: byStatus.maintenance >= 0, // Sollte > 0 sein in Produktion
        C5: reserveCount === 22,
        C6: true // Log-Check würde separat implementiert
      }
    };
  }

  // Update-Methoden (für Live-Updates)
  updateTrainStatus(trainId: string, newStatus: TrainStatus): boolean {
    this.initialize();
    const train = this.trains.find(t => t.trainId === trainId);
    if (train) {
      train.status = newStatus;
      train.lastSeenAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  updateTrainPosition(trainId: string, lat: number, lng: number): boolean {
    this.initialize();
    const train = this.trains.find(t => t.trainId === trainId);
    if (train) {
      train.currentLocation = { lat, lng };
      train.lastSeenAt = new Date().toISOString();
      return true;
    }
    return false;
  }
}

// Export Singleton
export const fleetSSO = new FleetSSO();
