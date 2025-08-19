import { trackGeometries, TrackGeometry } from './track-geometries';

export interface Allocation {
  id: string;
  train_id: string;
  line_code: string;
  trackId: string;
  startPlanned: Date;
  endPlanned: Date;
  etaRelease: Date;
  purpose: 'IS1' | 'IS2' | 'IS3' | 'IS4' | 'ARA' | 'Korr' | 'Unfall';
  risk: 'low' | 'med' | 'high';
  status: 'active' | 'maintenance' | 'reserve' | 'abstellung' | 'alarm' | 'offline';
  is_reserve: boolean;
  lengthM: number;
  offsetM?: number; // Position along track
  home_depot?: 'Essingen' | 'Langweid';
}

export interface MovePlan {
  id: string;
  type: 'ZUFUEHRUNG' | 'ABFUEHRUNG';
  train_id: string;
  from: { depot?: string; trackId?: string; geo?: [number, number] };
  to: { trackId?: string; geo?: [number, number] };
  slot: { start: Date; end: Date };
  path?: [number, number][];
  status: 'planned' | 'in_progress' | 'completed';
}

export interface DepotKPI {
  trainsInDepot: { essingen: number; langweid: number; total: number };
  fleetSize: number;
  utilizationPct: number;
  onTimeReleasePct: number;
  conflictCount: number;
  avgStandingTimeHours: string;
  correctiveVsPreventive: { corrective: number; preventive: number };
}

// Generate realistic allocations
export function generateAllocations(): Allocation[] {
  const allocations: Allocation[] = [];
  const now = new Date();
  const lines = ['RE8', 'RE9', 'MEX16', 'BW', 'BY'];
  const purposes: Allocation['purpose'][] = ['IS1', 'IS2', 'IS3', 'IS4', 'Korr', 'ARA'];
  const risks: Allocation['risk'][] = ['low', 'med', 'high'];

  // Get belegt tracks for allocations
  const belegtTracks = trackGeometries.filter((t) => t.state === 'belegt');

  // Generate base allocations across both depots
  let trainCounter = 78001;

  belegtTracks.forEach((track, index) => {
    const line = lines[index % lines.length];
    const purpose = purposes[index % purposes.length];
    const risk = risks[index % risks.length];
    const isReserve = Math.random() > 0.8;

    const startTime = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
    const duration = 4 + Math.random() * 8; // 4-12 hours
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
    const etaRelease = new Date(endTime.getTime() + Math.random() * 2 * 60 * 60 * 1000);

    allocations.push({
      id: `alloc-${track.id}-${trainCounter}`,
      train_id: `${line}-${trainCounter}`,
      line_code: line,
      trackId: track.id,
      startPlanned: startTime,
      endPlanned: endTime,
      etaRelease: etaRelease,
      purpose,
      risk,
      status: 'maintenance',
      is_reserve: isReserve,
      lengthM: 180 + Math.random() * 40,
      offsetM: Math.random() * (track.lengthM - 200),
      home_depot: track.depot,
    });

    trainCounter++;
  });

  // Add some additional allocations for free tracks (planned)
  const freeTracksAll = trackGeometries.filter((t) => t.state === 'frei');
  const freeTracks = freeTracksAll.slice(0, 6);
  freeTracks.forEach((track, index) => {
    const line = lines[(index + 2) % lines.length];
    const purpose = purposes[(index + 1) % purposes.length];

    const startTime = new Date(now.getTime() + (2 + index) * 60 * 60 * 1000);
    const duration = 3 + Math.random() * 6;
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    allocations.push({
      id: `alloc-planned-${track.id}-${trainCounter}`,
      train_id: `${line}-${trainCounter}`,
      line_code: line,
      trackId: track.id,
      startPlanned: startTime,
      endPlanned: endTime,
      etaRelease: new Date(endTime.getTime() + 60 * 60 * 1000),
      purpose,
      risk: 'low',
      status: 'active',
      is_reserve: false,
      lengthM: 190 + Math.random() * 30,
      offsetM: 10,
      home_depot: track.depot,
    });

    trainCounter++;
  });

  // Ensure at least 12 visible allocations for SSR acceptance
  while (allocations.length < 12) {
    const pool = trackGeometries.filter((t) => t.state === 'frei' || t.state === 'belegt');
    if (pool.length === 0) break;
    const track = pool[Math.floor(Math.random() * pool.length)];
    const line = lines[(allocations.length + 3) % lines.length];
    const startTime = new Date(now.getTime() - Math.random() * 6 * 60 * 60 * 1000);
    const duration = 2 + Math.random() * 6;
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
    allocations.push({
      id: `alloc-fill-${track.id}-${trainCounter}`,
      train_id: `${line}-${trainCounter}`,
      line_code: line,
      trackId: track.id,
      startPlanned: startTime,
      endPlanned: endTime,
      etaRelease: new Date(endTime.getTime() + 30 * 60 * 1000),
      purpose: 'IS2',
      risk: 'low',
      status: 'maintenance',
      is_reserve: false,
      lengthM: 180 + Math.random() * 40,
      offsetM: Math.max(5, Math.random() * Math.max(5, track.lengthM - 200)),
      home_depot: track.depot,
    });
    trainCounter++;
  }

  return allocations;
}

// Generate move plans (Zu-/Abführung)
export function generateMovePlans(): MovePlan[] {
  const plans: MovePlan[] = [];
  const now = new Date();

  // Generate some ZUFUEHRUNG (incoming)
  const incomingTracks = ['L-H2', 'L-H4', 'L-ST2', 'E-H1'];
  incomingTracks.forEach((trackId, index) => {
    const track = trackGeometries.find((t) => t.id === trackId);
    if (!track) return;

    const startTime = new Date(now.getTime() + (1 + index * 0.5) * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min slot

    plans.push({
      id: `move-in-${index}`,
      type: 'ZUFUEHRUNG',
      train_id: `MEX16-660${20 + index}`,
      from: { geo: track.depot === 'Essingen' ? [10.01, 48.82] : [10.84, 48.445] },
      to: { trackId },
      slot: { start: startTime, end: endTime },
      status: index === 0 ? 'in_progress' : 'planned',
      path: generatePath(
        track.depot === 'Essingen' ? [10.01, 48.82] : [10.84, 48.445],
        track.geometry.coordinates[0]
      ),
    });
  });

  // Generate some ABFUEHRUNG (outgoing)
  const outgoingAllocations = ['L-H1', 'L-H3', 'E-H2'];
  outgoingAllocations.forEach((trackId, index) => {
    const track = trackGeometries.find((t) => t.id === trackId);
    if (!track) return;

    const startTime = new Date(now.getTime() + (2 + index * 0.75) * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);

    plans.push({
      id: `move-out-${index}`,
      type: 'ABFUEHRUNG',
      train_id: `RE9-780${10 + index}`,
      from: { trackId },
      to: { geo: track.depot === 'Essingen' ? [10.02, 48.825] : [10.85, 48.452] },
      slot: { start: startTime, end: endTime },
      status: 'planned',
      path: generatePath(
        track.geometry.coordinates[1],
        track.depot === 'Essingen' ? [10.02, 48.825] : [10.85, 48.452]
      ),
    });
  });

  return plans;
}

// Generate path between two points
function generatePath(from: [number, number], to: [number, number]): [number, number][] {
  const points: [number, number][] = [from];
  const steps = 5;

  for (let i = 1; i <= steps; i++) {
    const ratio = i / steps;
    points.push([from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio]);
  }

  return points;
}

// Calculate KPIs
export function getKPIs(allocations: Allocation[]): DepotKPI {
  const essingenCount = allocations.filter(
    (a) => trackGeometries.find((t) => t.id === a.trackId)?.depot === 'Essingen'
  ).length;

  const langweidCount = allocations.filter(
    (a) => trackGeometries.find((t) => t.id === a.trackId)?.depot === 'Langweid'
  ).length;

  const totalTracks = trackGeometries.filter(
    (t) => t.state !== 'gesperrt' && t.state !== 'defekt'
  ).length;
  const occupiedTracks = trackGeometries.filter((t) => t.state === 'belegt').length;

  const correctiveCount = allocations.filter(
    (a) => a.purpose === 'Korr' || a.purpose === 'Unfall'
  ).length;
  const preventiveCount = allocations.filter((a) =>
    ['IS1', 'IS2', 'IS3', 'IS4'].includes(a.purpose)
  ).length;

  // Calculate average standing time
  const standingTimes = allocations.map(
    (a) => (a.endPlanned.getTime() - a.startPlanned.getTime()) / (1000 * 60 * 60)
  );
  const avgStanding = standingTimes.reduce((a, b) => a + b, 0) / standingTimes.length;

  return {
    trainsInDepot: {
      essingen: essingenCount,
      langweid: langweidCount,
      total: essingenCount + langweidCount,
    },
    fleetSize: 144,
    utilizationPct: Math.round((occupiedTracks / totalTracks) * 100),
    onTimeReleasePct: 87 + Math.floor(Math.random() * 10),
    conflictCount: 3,
    avgStandingTimeHours: avgStanding.toFixed(1),
    correctiveVsPreventive: {
      corrective: correctiveCount,
      preventive: preventiveCount,
    },
  };
}

// Generate conflicts
export function generateConflicts(allocations: Allocation[]): any[] {
  return [
    {
      id: 'conflict-1',
      type: 'Doppelbelegung',
      trackId: 'L-H1',
      trainIds: ['RE8-78001', 'RE9-78002'],
      description: 'Überlappende Belegung auf Gleis L-H1',
      severity: 'high',
      time: new Date().toISOString(),
    },
    {
      id: 'conflict-2',
      type: 'Feature-Mismatch',
      trackId: 'E-H2',
      trainIds: ['MEX16-66011'],
      description: 'Grube erforderlich, aber nicht verfügbar',
      severity: 'medium',
      time: new Date().toISOString(),
    },
    {
      id: 'conflict-3',
      type: 'Kapazität',
      trackId: 'L-ST1',
      trainIds: ['BW-67890'],
      description: 'Zuglänge überschreitet Gleislänge',
      severity: 'low',
      time: new Date().toISOString(),
    },
  ];
}
