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

// Reale Gleiskonfiguration basierend auf tatsächlichen Depots
const TRACKS: Track[] = [
  // Essingen - Reale Gleise
  { id: 'E-H1', name: 'Halle 1', depot: 'Essingen', length: 240, features: ['Halle', 'Grube', 'OL'], status: 'Belegt' },
  { id: 'E-H2', name: 'Halle 2', depot: 'Essingen', length: 240, features: ['Halle', 'Grube', 'OL'], status: 'Belegt' },
  { id: 'E-ARA1', name: 'Außenreinigung', depot: 'Essingen', length: 120, features: ['Waschhalle'], status: 'Frei' },
  { id: 'E-ST1', name: 'Abstellung 1', depot: 'Essingen', length: 200, features: ['OL'], status: 'Belegt' },
  
  // Langweid - Reale Gleise
  { id: 'L-H1', name: 'Halle 1', depot: 'Langweid', length: 220, features: ['Halle', 'OL'], status: 'Belegt' },
  { id: 'L-H2', name: 'Halle 2', depot: 'Langweid', length: 220, features: ['Halle', 'OL'], status: 'Belegt' },
  { id: 'L-H3', name: 'Halle 3', depot: 'Langweid', length: 220, features: ['Halle', 'OL', 'Radsatzdrehmaschine'], status: 'Belegt' },
  { id: 'L-H4', name: 'Halle 4', depot: 'Langweid', length: 220, features: ['Halle', 'OL'], status: 'Frei' },
  { id: 'L-H5', name: 'Halle 5', depot: 'Langweid', length: 220, features: ['Halle', 'OL'], status: 'Belegt' },
  { id: 'L-ST1', name: 'Yard 1', depot: 'Langweid', length: 180, features: ['OL'], status: 'Belegt' },
  { id: 'L-ST2', name: 'Yard 2', depot: 'Langweid', length: 180, features: ['OL'], status: 'Frei' },
  { id: 'L-ST3', name: 'Yard 3', depot: 'Langweid', length: 180, features: ['OL'], status: 'Belegt' },
  { id: 'L-ST4', name: 'Yard 4', depot: 'Langweid', length: 180, features: ['OL'], status: 'Belegt' },
  { id: 'L-ST5', name: 'Yard 5', depot: 'Langweid', length: 180, features: ['Shore-Power'], status: 'Frei' },
  { id: 'L-ST6', name: 'Yard 6', depot: 'Langweid', length: 180, features: ['Shore-Power'], status: 'Belegt' },
  
  // Phase 2 - Im Bau (optional anzeigbar)
  { id: 'L-H6', name: 'Halle 6 (Planung)', depot: 'Langweid', length: 220, features: ['Halle', 'OL'], status: 'Gesperrt' },
  { id: 'L-H7', name: 'Halle 7 (Planung)', depot: 'Langweid', length: 220, features: ['Halle', 'OL'], status: 'Gesperrt' },
  { id: 'L-H8', name: 'Halle 8 (Planung)', depot: 'Langweid', length: 220, features: ['Halle', 'OL'], status: 'Gesperrt' },
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

// Generiere realistische Belegungen basierend auf Fleet-Daten
function generateAllocations(): Allocation[] {
  const allocations: Allocation[] = [];
  const now = new Date();
  const fleetData = loadFleetData();
  const isLevels: Allocation['isLevel'][] = ['IS1', 'IS2', 'IS3', 'IS4'];
  const taskOptions = [
    ['IS1: Sichtprüfung', 'Bremsentest'],
    ['IS2: Türmechanik', 'Klimaanlage'],
    ['IS3: Radsatzwechsel', 'Laufwerksrevision'],
    ['IS4: Hauptuntersuchung', 'Komponentenaustausch'],
    ['Reinigung innen', 'Reinigung außen'],
    ['Softwareupdate', 'Diagnose']
  ];
  const teams = ['Team Alpha', 'Team Bravo', 'Team Charlie', 'Team Delta'];
  const shifts = ['Frühschicht', 'Spätschicht', 'Nachtschicht'];
  
  // Generiere realistische Depot-Belegungen aus tatsächlicher Flotte
  let allocationId = 1;
  
  // Filter Züge nach Depot für realistische Verteilung
  const essingenTrains = fleetData.filter(t => t.homeDepot === 'Essingen');
  const langweidTrains = fleetData.filter(t => t.homeDepot === 'Langweid');
  
  // Belege Gleise mit tatsächlichen Zügen
  TRACKS.forEach((track, index) => {
    if (track.status === 'Belegt' && allocationId <= 25) {
      // Wähle Züge basierend auf Depot
      const depotTrains = track.depot === 'Essingen' ? essingenTrains : langweidTrains;
      const trainData = depotTrains[allocationId % depotTrains.length];
      
      if (trainData) {
        const startOffset = Math.floor(Math.random() * 48); // Stunden ab jetzt
        const duration = trainData.isReserve ? 24 : (2 + Math.floor(Math.random() * 10)); // Reserve länger
        const startTime = new Date(now.getTime() + startOffset * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
        const etaRelease = new Date(endTime.getTime() + Math.random() * 2 * 60 * 60 * 1000);
        
        const trainId = trainData.trainId;
        const lineId = trainData.lineCode;
        
        // Risiko wenn ETA zu knapp
        const etaDiff = etaRelease.getTime() - endTime.getTime();
        const riskLevel: Allocation['riskLevel'] = 
          etaDiff < 30 * 60 * 1000 ? 'high' : 
          etaDiff < 60 * 60 * 1000 ? 'medium' : 
          'low';
        
        // Konflikt bei jedem 5. Eintrag
        const hasConflict = allocationId % 5 === 0;
        
        allocations.push({
          id: `ALLOC-${String(allocationId).padStart(4, '0')}`,
          trackId: track.id,
          trainId,
          lineId,
          isLevel: trainData.isReserve ? 'IS4' : isLevels[allocationId % 4],
          tasks: trainData.isReserve ? ['Reserve-Bereitstellung', 'Systemcheck'] : taskOptions[allocationId % taskOptions.length],
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          etaRelease: etaRelease.toISOString(),
          status: trainData.status === 'maintenance' ? 'In Arbeit' :
                  trainData.isReserve ? 'Geplant' :
                  allocationId < 5 ? 'In Arbeit' : 
                  allocationId < 10 ? 'Zugewiesen' : 
                  allocationId < 15 ? 'Geplant' : 
                  allocationId < 18 ? 'QA' : 'Freigegeben',
          team: teams[allocationId % teams.length],
          shift: shifts[Math.floor(startOffset / 8) % 3],
          hasConflict,
          riskLevel,
          isReserve: trainData.isReserve,
          homeDepot: trainData.homeDepot
        });
        
        allocationId++;
      }
    }
  });
  
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
