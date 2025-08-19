import DepotClient from './DepotClient';

export interface Track {
  id: string;
  name: string;
  depot: 'Essingen' | 'Langweid';
  length: number;
  features: ('OL' | 'Grube' | 'Radsatzdrehmaschine' | 'Waschhalle' | 'Shore-Power' | 'Halle')[];
  status: 'Frei' | 'Belegt' | 'Gesperrt';
}

export interface Allocation {
  id: string;
  trackId: string;
  trainId: string;
  lineId: string;
  isLevel: 'IS1' | 'IS2' | 'IS3' | 'IS4';
  tasks: string[];
  startTime: string; // ISO8601
  endTime: string; // ISO8601
  etaRelease: string; // ISO8601
  status: 'Geplant' | 'Zugewiesen' | 'In Arbeit' | 'QA' | 'Freigegeben';
  team?: string;
  shift?: string;
  hasConflict?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
  isReserve?: boolean;
  homeDepot?: string;
}

export interface Conflict {
  id: string;
  type: 'Doppelbelegung' | 'Feature-Mismatch' | 'Team-Überbuchung' | 'Kapazität';
  trackId: string;
  trainIds: string[];
  description: string;
  severity: 'low' | 'medium' | 'high';
  time: string;
}

// Erweiterte Gleiskonfiguration aus depot_tracks.yaml für 80% Auslastung
const TRACKS: Track[] = [
  // Essingen - 12 Gleise (4 Wartung, 6 Service, 2 Abstellung)
  { id: 'E-G1', name: 'Wartungsgleis 1', depot: 'Essingen', length: 180, features: ['Grube', 'OL', 'Shore-Power'], status: 'Belegt' },
  { id: 'E-G2', name: 'Wartungsgleis 2', depot: 'Essingen', length: 180, features: ['Grube', 'OL', 'Shore-Power', 'Radsatzdrehmaschine'], status: 'Belegt' },
  { id: 'E-G3', name: 'Wartungsgleis 3', depot: 'Essingen', length: 120, features: ['Grube', 'Shore-Power'], status: 'Belegt' },
  { id: 'E-G4', name: 'Wartungsgleis 4', depot: 'Essingen', length: 120, features: ['Grube', 'Shore-Power', 'OL'], status: 'Belegt' },
  { id: 'E-S1', name: 'Service 1', depot: 'Essingen', length: 240, features: ['Shore-Power', 'Waschhalle'], status: 'Belegt' },
  { id: 'E-S2', name: 'Service 2', depot: 'Essingen', length: 240, features: ['Shore-Power'], status: 'Belegt' },
  { id: 'E-S3', name: 'Service 3', depot: 'Essingen', length: 180, features: ['Shore-Power'], status: 'Belegt' },
  { id: 'E-S4', name: 'Service 4', depot: 'Essingen', length: 180, features: ['Shore-Power'], status: 'Belegt' },
  { id: 'E-S5', name: 'Service 5', depot: 'Essingen', length: 120, features: ['Shore-Power'], status: 'Frei' },
  { id: 'E-S6', name: 'Service 6', depot: 'Essingen', length: 120, features: ['Shore-Power'], status: 'Belegt' },
  { id: 'E-A1', name: 'Abstellung 1', depot: 'Essingen', length: 360, features: [], status: 'Belegt' },
  { id: 'E-A2', name: 'Abstellung 2', depot: 'Essingen', length: 360, features: [], status: 'Belegt' },
  
  // Langweid - 16 Gleise (6 Wartung, 7 Service, 3 Abstellung)
  { id: 'L-G1', name: 'Wartungsgleis 1', depot: 'Langweid', length: 200, features: ['Grube', 'OL', 'Shore-Power', 'Radsatzdrehmaschine'], status: 'Belegt' },
  { id: 'L-G2', name: 'Wartungsgleis 2', depot: 'Langweid', length: 200, features: ['Grube', 'OL', 'Shore-Power'], status: 'Belegt' },
  { id: 'L-G3', name: 'Wartungsgleis 3', depot: 'Langweid', length: 160, features: ['Grube', 'Shore-Power', 'OL'], status: 'Belegt' },
  { id: 'L-G4', name: 'Wartungsgleis 4', depot: 'Langweid', length: 160, features: ['Grube', 'Shore-Power'], status: 'Belegt' },
  { id: 'L-G5', name: 'Wartungsgleis 5', depot: 'Langweid', length: 120, features: ['Grube', 'Shore-Power'], status: 'Belegt' },
  { id: 'L-G6', name: 'Wartungsgleis 6', depot: 'Langweid', length: 120, features: ['Grube', 'Shore-Power'], status: 'Belegt' },
  { id: 'L-S1', name: 'Service 1', depot: 'Langweid', length: 240, features: ['Shore-Power', 'Waschhalle'], status: 'Belegt' },
  { id: 'L-S2', name: 'Service 2 (H2)', depot: 'Langweid', length: 240, features: ['Shore-Power'], status: 'Belegt' },
  { id: 'L-S3', name: 'Service 3', depot: 'Langweid', length: 200, features: ['Shore-Power'], status: 'Belegt' },
  { id: 'L-S4', name: 'Service 4', depot: 'Langweid', length: 180, features: ['Shore-Power'], status: 'Belegt' },
  { id: 'L-S5', name: 'Service 5', depot: 'Langweid', length: 160, features: ['Shore-Power'], status: 'Frei' },
  { id: 'L-S6', name: 'Service 6', depot: 'Langweid', length: 160, features: ['Shore-Power'], status: 'Belegt' },
  { id: 'L-S7', name: 'Service 7', depot: 'Langweid', length: 120, features: ['Shore-Power'], status: 'Belegt' },
  { id: 'L-A1', name: 'Abstellung 1', depot: 'Langweid', length: 400, features: [], status: 'Belegt' },
  { id: 'L-A2', name: 'Abstellung 2', depot: 'Langweid', length: 400, features: [], status: 'Belegt' },
  { id: 'L-A3', name: 'Abstellung 3', depot: 'Langweid', length: 300, features: [], status: 'Belegt' },
];

// Lade Fleet-Daten aus CSV für realistische Belegungen
function loadFleetData(): Array<{trainId: string, lineCode: string, region: string, homeDepot: string, isReserve: boolean, status: string}> {
  // In Production würde dies aus der CSV geladen - hier als Beispiel hartcodiert
  const fleetData = [];
  
  // Essingen Züge (60 + 9 Reserve)
  for (let i = 1; i <= 32; i++) {
    fleetData.push({ trainId: `RE9-${60000 + i}`, lineCode: 'RE9', region: 'BW', homeDepot: 'Essingen', isReserve: false, status: 'active' });
  }
  for (let i = 1; i <= 28; i++) {
    fleetData.push({ trainId: `RE8-${70000 + i}`, lineCode: 'RE8', region: 'BW', homeDepot: 'Essingen', isReserve: false, status: 'active' });
  }
  for (let i = 1; i <= 9; i++) {
    fleetData.push({ trainId: `RES-${90000 + i}`, lineCode: 'RESERVE', region: 'BW', homeDepot: 'Essingen', isReserve: true, status: 'reserve' });
  }
  
  // Langweid Züge (84 + 13 Reserve)
  for (let i = 1; i <= 30; i++) {
    fleetData.push({ trainId: `MEX16-${80000 + i}`, lineCode: 'MEX16', region: 'BY', homeDepot: 'Langweid', isReserve: false, status: 'active' });
  }
  for (let i = 1; i <= 18; i++) {
    fleetData.push({ trainId: `MEX12-${81000 + i}`, lineCode: 'MEX12', region: 'BY', homeDepot: 'Langweid', isReserve: false, status: 'active' });
  }
  for (let i = 1; i <= 18; i++) {
    fleetData.push({ trainId: `S6-${82000 + i}`, lineCode: 'S6', region: 'BY', homeDepot: 'Langweid', isReserve: false, status: 'active' });
  }
  for (let i = 1; i <= 18; i++) {
    fleetData.push({ trainId: `S2-${83000 + i}`, lineCode: 'S2', region: 'BY', homeDepot: 'Langweid', isReserve: false, status: 'active' });
  }
  for (let i = 1; i <= 13; i++) {
    fleetData.push({ trainId: `RES-${91000 + i}`, lineCode: 'RESERVE', region: 'BY', homeDepot: 'Langweid', isReserve: true, status: i === 12 ? 'maintenance' : 'reserve' });
  }
  
  return fleetData;
}

// Generiere realistische Belegungen für 14 Tage mit 80% Auslastung
function generateAllocations(): Allocation[] {
  const allocations: Allocation[] = [];
  const now = new Date();
  const fleetData = loadFleetData();
  const isLevels: Allocation['isLevel'][] = ['IS1', 'IS2', 'IS3', 'IS4'];
  const taskOptions = [
    ['IS1: Sichtprüfung', 'Bremsentest', 'Funktionscheck'],
    ['IS2: Türmechanik', 'Klimaanlage', 'Beleuchtung'],
    ['IS3: Radsatzwechsel', 'Laufwerksrevision', 'Bremsbeläge'],
    ['IS4: Hauptuntersuchung', 'Komponentenaustausch', 'Modernisierung'],
    ['Reinigung innen', 'Reinigung außen', 'Desinfektion'],
    ['Softwareupdate', 'Diagnose', 'Kalibrierung']
  ];
  const teams = ['Team Alpha', 'Team Bravo', 'Team Charlie', 'Team Delta', 'Team Echo', 'Team Foxtrot'];
  const shifts = ['Frühschicht', 'Spätschicht', 'Nachtschicht'];
  
  // Generiere realistische Depot-Belegungen für 14 Tage
  let allocationId = 1;
  const DAYS_TO_PLAN = 14;
  const TARGET_TRAINS = 115; // 80% von 144 Zügen
  
  // Alle 144 Züge generieren
  const allTrains = [];
  for (let i = 1; i <= 144; i++) {
    const depot = i <= 59 ? 'Essingen' : 'Langweid';
    const vehicleType = i <= 59 ? 'FLIRT' : i <= 108 ? 'MIREO' : 'DESIRO';
    const lineCode = i <= 59 ? ['RE1', 'RE2', 'RE8', 'RB22', 'RB27'][i % 5] :
                     i <= 108 ? ['RE9', 'RE12', 'MEX16', 'MEX18', 'MEX12', 'RB32', 'RB54'][i % 7] :
                     i <= 122 ? ['S2', 'S3', 'S4', 'S6'][i % 4] : 'RESERVE';
    const isReserve = i > 122;
    allTrains.push({
      trainId: `${vehicleType}-${60000 + i}`,
      lineCode,
      homeDepot: depot,
      isReserve,
      vehicleType
    });
  }
  
  // Verteile TARGET_TRAINS Züge über 14 Tage und alle Gleise
  const tracksEssingen = TRACKS.filter(t => t.depot === 'Essingen' && t.status !== 'Gesperrt');
  const tracksLangweid = TRACKS.filter(t => t.depot === 'Langweid' && t.status !== 'Gesperrt');
  
  // Generiere Belegungen für jeden Tag
  for (let day = 0; day < DAYS_TO_PLAN; day++) {
    const trainsPerDay = Math.floor(TARGET_TRAINS / DAYS_TO_PLAN) + (day < TARGET_TRAINS % DAYS_TO_PLAN ? 1 : 0);
    
    // Wähle zufällige Züge für diesen Tag
    const shuffledTrains = [...allTrains].sort(() => Math.random() - 0.5);
    const todaysTrains = shuffledTrains.slice(0, trainsPerDay);
    
    todaysTrains.forEach((train, idx) => {
      // Bestimme Gleis basierend auf Depot
      const availableTracks = train.homeDepot === 'Essingen' ? tracksEssingen : tracksLangweid;
      const track = availableTracks[idx % availableTracks.length];
      
      if (track && allocationId <= 250) { // Maximal 250 Allocations generieren
        // Zeitplanung für diesen Zug
        const baseOffset = day * 24; // Tag in Stunden
        const hourInDay = Math.floor(Math.random() * 24); // Zufällige Stunde im Tag
        const startOffset = baseOffset + hourInDay;
        
        // Wartungsdauer basierend auf Wartungstyp
        const isLevel = train.isReserve ? 'IS4' : isLevels[Math.floor(Math.random() * 4)];
        const duration = isLevel === 'IS1' ? 2 + Math.random() * 2 :
                        isLevel === 'IS2' ? 4 + Math.random() * 4 :
                        isLevel === 'IS3' ? 12 + Math.random() * 12 :
                        isLevel === 'IS4' ? 24 + Math.random() * 48 :
                        4 + Math.random() * 4;
        
        const startTime = new Date(now.getTime() + startOffset * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
        const etaRelease = new Date(endTime.getTime() + Math.random() * 2 * 60 * 60 * 1000);
        
        const trainId = train.trainId;
        const lineId = train.lineCode;
        
        // Risiko wenn ETA zu knapp
        const etaDiff = etaRelease.getTime() - endTime.getTime();
        const riskLevel: Allocation['riskLevel'] = 
          etaDiff < 30 * 60 * 1000 ? 'high' : 
          etaDiff < 60 * 60 * 1000 ? 'medium' : 
          'low';
        
        // Konflikt bei jedem 5. Eintrag
        const hasConflict = allocationId % 5 === 0;
        
        // Status basierend auf Zeitpunkt
        const hoursFromNow = startTime.getTime() - now.getTime() / (1000 * 60 * 60);
        const status = hoursFromNow < 0 ? 'Freigegeben' :
                      hoursFromNow < 24 ? 'In Arbeit' :
                      hoursFromNow < 72 ? 'Zugewiesen' :
                      hoursFromNow < 168 ? 'Geplant' :
                      'Geplant';
        
        allocations.push({
          id: `ALLOC-${String(allocationId).padStart(4, '0')}`,
          trackId: track.id,
          trainId,
          lineId,
          isLevel,
          tasks: train.isReserve ? ['Reserve-Bereitstellung', 'Systemcheck', 'Verfügbarkeit'] : 
                 taskOptions[Math.floor(Math.random() * taskOptions.length)],
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          etaRelease: etaRelease.toISOString(),
          status,
          team: teams[allocationId % teams.length],
          shift: shifts[Math.floor(hourInDay / 8) % 3],
          hasConflict: Math.random() < 0.1, // 10% Konfliktwahrscheinlichkeit
          riskLevel,
          isReserve: train.isReserve,
          homeDepot: train.homeDepot
        });
        
        allocationId++;
      }
    });
  }
  
  return allocations;
}

// Generiere Konflikte
function generateConflicts(allocations: Allocation[]): Conflict[] {
  const conflicts: Conflict[] = [];
  
  // Finde Überlappungen
  allocations.forEach((a1, i) => {
    allocations.slice(i + 1).forEach(a2 => {
      if (a1.trackId === a2.trackId) {
        const start1 = new Date(a1.startTime).getTime();
        const end1 = new Date(a1.endTime).getTime();
        const start2 = new Date(a2.startTime).getTime();
        const end2 = new Date(a2.endTime).getTime();
        
        if ((start1 <= start2 && end1 > start2) || (start2 <= start1 && end2 > start1)) {
          conflicts.push({
            id: `CONF-${conflicts.length + 1}`,
            type: 'Doppelbelegung',
            trackId: a1.trackId,
            trainIds: [a1.trainId, a2.trainId],
            description: `Gleiskonflikt ${a1.trackId}: ${a1.trainId} und ${a2.trainId} überlappen sich`,
            severity: 'high',
            time: new Date(Math.max(start1, start2)).toISOString()
          });
        }
      }
    });
  });
  
  // Feature-Mismatch Beispiele
  const featureMismatches = [
    { track: 'E-G3', train: 'RE9-60021', needed: 'OL', severity: 'medium' as const },
    { track: 'L-G4', train: 'MEX16-60014', needed: 'Grube', severity: 'high' as const }
  ];
  
  featureMismatches.forEach((mismatch, i) => {
    conflicts.push({
      id: `CONF-FM-${i + 1}`,
      type: 'Feature-Mismatch',
      trackId: mismatch.track,
      trainIds: [mismatch.train],
      description: `${mismatch.train} benötigt ${mismatch.needed}, ${mismatch.track} hat diese Ausstattung nicht`,
      severity: mismatch.severity,
      time: new Date().toISOString()
    });
  });
  
  // Team-Überbuchung
  if (allocations.filter(a => a.team === 'Team Alpha' && a.status === 'In Arbeit').length > 3) {
    conflicts.push({
      id: 'CONF-TEAM-1',
      type: 'Team-Überbuchung',
      trackId: 'E-G1',
      trainIds: allocations.filter(a => a.team === 'Team Alpha').map(a => a.trainId).slice(0, 4),
      description: 'Team Alpha ist mit 4 parallelen Arbeiten überbucht (Max: 3)',
      severity: 'medium',
      time: new Date().toISOString()
    });
  }
  
  return conflicts;
}

export default async function DepotPage() {
  // SSR: Generiere alle Daten serverseitig
  const tracks = TRACKS;
  const allocations = generateAllocations();
  const conflicts = generateConflicts(allocations);
  
  // Berechne KPIs mit 144-Züge-Referenz
  const trainsInDepot = new Set(allocations.map(a => a.trainId)).size;
  const reserveCount = allocations.filter(a => a.isReserve).length;
  const occupiedTracks = new Set(allocations.filter(a => a.status === 'In Arbeit').map(a => a.trackId)).size;
  const totalTracks = tracks.filter(t => t.status !== 'Gesperrt').length; // Nur aktive Gleise zählen
  const utilizationPct = Math.round((occupiedTracks / totalTracks) * 100);
  
  // On-Time Release berechnen
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const releasesToday = allocations.filter(a => {
    const eta = new Date(a.etaRelease);
    return eta >= today && eta < tomorrow;
  });
  
  const onTimeReleases = releasesToday.filter(a => a.riskLevel !== 'high');
  const onTimeReleasePct = releasesToday.length > 0 
    ? Math.round((onTimeReleases.length / releasesToday.length) * 100)
    : 100;
  
  // Durchschnittliche Standzeit
  const avgStandingTime = allocations.reduce((sum, a) => {
    const duration = (new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / (1000 * 60 * 60);
    return sum + duration;
  }, 0) / allocations.length;
  
  const kpis = {
    trainsInDepot,
    fleetSize: 144,
    utilizationPct,
    onTimeReleasePct,
    conflictCount: conflicts.length,
    avgStandingTimeHours: avgStandingTime.toFixed(1),
    correctiveVsPreventive: { corrective: 3, preventive: 7 } // Beispielwerte
  };
  
  return (
    <DepotClient 
      initialTracks={tracks}
      initialAllocations={allocations}
      initialConflicts={conflicts}
      initialKpis={kpis}
    />
  );
}
