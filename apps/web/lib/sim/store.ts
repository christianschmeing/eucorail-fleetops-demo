import { create } from 'zustand';
import linesDataset from '@/data/lines-complete.json';

export type LatLng = { lat: number; lon?: number; lng?: number };

export type LinePoly = {
  id: string;
  name: string;
  color: string;
  coords: Array<[number, number]>; // [lng,lat]
  approx: boolean;
};

export type VehicleStatus = 'active' | 'maintenance' | 'reserve' | 'offline';

export type Vehicle = {
  id: string;
  lineId: string;
  region: 'BW' | 'BY';
  status: VehicleStatus;
  progress: number; // 0..1 along polyline
  speedKmh: number;
};

export type SimState = {
  lines: Record<string, LinePoly>;
  vehicles: Vehicle[];
  tickSeconds: number;
  buildLinesFromDataset: () => void;
  allocateFleet: () => void;
  start: () => void;
  stop: () => void;
};

const BW_LINES = ['MEX13', 'RE1', 'MEX16', 'RE8', 'RE90'];
const BY_LINES = ['RE9', 'RE80', 'RE89', 'RB86', 'RB87', 'RB89', 'RE72', 'RE96', 'RB92'];

// Hard allocation derived from fleet-allocation.json
const ALLOCATION_COUNTS: Record<string, number> = {
  // BW total 45
  MEX13: 10, // 4+3+3
  MEX16: 13, // 10+3
  RE1: 8, // 3+2+3
  RE8: 9, // 3+3+3
  RE90: 5, // 2+1+2
  // BY
  RE72: 7,
  RE96: 9,
  RB92: 6,
  RE9: 10, // 4 Desiro + 6 Mireo (count vehicles, not consists)
  RE80: 10,
  RE89: 10,
  RB86: 10,
  RB87: 10,
  RB89: 6,
};

let timer: any = null;

function stationToLngLat(s: LatLng): [number, number] {
  const lng = (s as any).lng ?? s.lon ?? 10;
  return [lng, s.lat];
}

export const useSimStore = create<SimState>((set, get) => ({
  lines: {},
  vehicles: [],
  tickSeconds: 15, // smoother animation steps

  buildLinesFromDataset: () => {
    const lines: Record<string, LinePoly> = {};
    const groups: any[] = [
      ...(((linesDataset as any).baden_wuerttemberg as any[]) ?? []),
      ...(((linesDataset as any).bayern as any[]) ?? []),
    ];
    for (const g of groups) {
      const coords: Array<[number, number]> = Array.isArray(g.stations)
        ? (g.stations as LatLng[]).map(stationToLngLat)
        : [];
      if (coords.length >= 2) {
        lines[g.id] = {
          id: g.id,
          name: g.name,
          color: g.color ?? '#00A3FF',
          coords,
          approx: true,
        };
      }
    }
    set({ lines });
  },

  allocateFleet: () => {
    const lines = get().lines;
    const allLineIds = [...BW_LINES, ...BY_LINES].filter((id) => !!lines[id]);
    if (allLineIds.length === 0) return;

    // exact totals from provided spec
    const TOTAL = 144;
    const active = 123; // in_service_total
    const reserve = 21; // maintenance_reserve_total (model as reserve/maintenance)
    const maint = Math.floor(reserve * 0.6);
    const offline = TOTAL - active - reserve; // any slack

    const bucket: VehicleStatus[] = [];
    bucket.push(...Array(active).fill('active'));
    bucket.push(...Array(maint).fill('maintenance'));
    bucket.push(...Array(reserve).fill('reserve'));
    bucket.push(...Array(offline).fill('offline'));

    // fixed line distribution by ALLOCATION_COUNTS
    const vehicles: Vehicle[] = [];
    const linesExpanded: string[] = [];
    for (const lineId of allLineIds) {
      const c = ALLOCATION_COUNTS[lineId] ?? 0;
      for (let i = 0; i < c; i++) linesExpanded.push(lineId);
    }
    while (linesExpanded.length < TOTAL) {
      for (const l of allLineIds) {
        if (linesExpanded.length >= TOTAL) break;
        linesExpanded.push(l);
      }
    }
    for (let i = 0; i < TOTAL; i++) {
      const lineId = linesExpanded[i % linesExpanded.length];
      const region: 'BW' | 'BY' = BW_LINES.includes(lineId) ? 'BW' : 'BY';
      const status = bucket[i];
      vehicles.push({
        id: `${lineId}-${60000 + i + 1}`,
        lineId,
        region,
        status,
        progress: Math.random(),
        speedKmh: status === 'active' ? 90 + Math.random() * 30 : 0,
      });
    }
    set({ vehicles });
  },

  start: () => {
    if (timer) return;
    const advanceFactor = 2; // smaller step per tick for smoother movement
    timer = setInterval(() => {
      set((state) => {
        const lines = state.lines;
        const vehicles = state.vehicles.map((v) => {
          if (v.status !== 'active') return v;
          const line = lines[v.lineId];
          if (!line || line.coords.length < 2) return v;
          const km = v.speedKmh * (state.tickSeconds / 3600) * advanceFactor; // km per tick
          // assume ~120km typical route length; smaller frac for less jumping
          const frac = Math.min(1, km / 120);
          let progress = v.progress + frac;
          if (progress > 1) progress -= 1; // loop back
          return { ...v, progress };
        });
        return { vehicles } as Partial<SimState>;
      });
    }, 1000);
  },

  stop: () => {
    if (timer) clearInterval(timer);
    timer = null;
  },
}));
