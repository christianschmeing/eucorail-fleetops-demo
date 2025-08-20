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

    // status mix (~75% active, 8% maintenance, 12% reserve, 5% offline)
    const TOTAL = 144;
    const active = Math.round(TOTAL * 0.75);
    const maint = Math.round(TOTAL * 0.08);
    const reserve = Math.round(TOTAL * 0.12);
    const offline = TOTAL - active - maint - reserve;

    const bucket: VehicleStatus[] = [];
    bucket.push(...Array(active).fill('active'));
    bucket.push(...Array(maint).fill('maintenance'));
    bucket.push(...Array(reserve).fill('reserve'));
    bucket.push(...Array(offline).fill('offline'));

    // equal distribution across available lines
    const vehicles: Vehicle[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const lineId = allLineIds[i % allLineIds.length];
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
