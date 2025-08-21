import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import fleetData from '@/data/arverio-fleet-real.json';
import { ECM_PROFILES, FAILURE_RATES_PER_10K_KM } from '@/lib/maintenance/ecm-profiles';
import type { TcmsEvent } from '@/lib/tcms/types';

type MaintenanceStage = 'IS1' | 'IS2' | 'IS3' | 'IS4' | 'IS5' | 'IS6';
type MaintenanceType = MaintenanceStage | 'WHEEL_LATHE';

interface Position {
  lat: number;
  lon: number;
}
interface Vehicle {
  id: string;
  type: 'FLIRT3' | 'MIREO' | 'DESIRO_HC';
  operator: string;
  line?: string;
  depot?: 'ESS' | 'GAB';
  status?: 'OPERATIONAL' | 'MAINTENANCE' | 'DEPOT';
  position?: Position;
  heading?: number;
  speed?: number;
  delay?: number;
  mileageKm?: number;
  commissioningDate?: Date;
  lastServiceDate?: Partial<Record<MaintenanceStage, Date>>;
  nextServiceOverrides?: Partial<Record<MaintenanceStage, { date?: Date; mileageKm?: number }>>;
  isDue?: Partial<Record<MaintenanceStage, boolean>>;
  kmToNext?: Partial<Record<MaintenanceStage, number>>;
  daysToNext?: Partial<Record<MaintenanceStage, number>>;
  nextDueDate?: Partial<Record<MaintenanceStage, Date>>;
}

interface WorkOrder {
  id: string;
  vehicleId: string;
  type: MaintenanceType;
  status: 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'DONE';
  createdAt: Date;
  depot?: 'ESS' | 'GAB';
  estimatedDuration?: number;
}

interface KPIs {
  availability: number;
  mtbf: number;
  mttr: number;
  firstTimeFixRate: number;
  complianceScore: number;
}

// Maintenance stages must be initialized BEFORE any compute function runs
const STAGES: MaintenanceStage[] = ['IS1', 'IS2', 'IS3', 'IS4', 'IS5', 'IS6'];

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function computeDueFields(vehicle: Vehicle): Vehicle {
  const profileKey = vehicle.type as keyof typeof ECM_PROFILES;
  const prof = ECM_PROFILES[profileKey];
  const mileage = vehicle.mileageKm || 0;
  const commissioning =
    vehicle.commissioningDate || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const isDue: Partial<Record<MaintenanceStage, boolean>> = {};
  const kmToNext: Partial<Record<MaintenanceStage, number>> = {};
  const daysToNext: Partial<Record<MaintenanceStage, number>> = {};
  const nextDueDate: Partial<Record<MaintenanceStage, Date>> = {};
  const lastServiceDate: Partial<Record<MaintenanceStage, Date>> = {
    ...(vehicle.lastServiceDate || {}),
  };

  STAGES.forEach((st) => {
    const cfg = (prof as any)[st];
    if (!cfg) return;
    const periodKm = cfg.periodKm as number | undefined;
    const periodDays = cfg.periodDays as number | undefined;
    if (!lastServiceDate[st] && periodDays) {
      lastServiceDate[st] = addDays(commissioning, -Math.floor(periodDays / 2));
    }
    const kmProgress = periodKm ? mileage % periodKm : 0;
    const daysProgress = periodDays ? daysBetween(lastServiceDate[st] || commissioning, now) : 0;
    const kmRem = periodKm ? Math.max(0, periodKm - kmProgress) : 0;
    const daysRem = periodDays ? Math.max(0, periodDays - daysProgress) : 0;
    kmToNext[st] = kmRem;
    daysToNext[st] = daysRem;
    nextDueDate[st] = periodDays ? addDays(now, daysRem) : undefined;
    isDue[st] = (periodKm ? kmRem <= 0 : false) || (periodDays ? daysRem <= 0 : false);
  });

  return {
    ...vehicle,
    lastServiceDate,
    isDue,
    kmToNext,
    daysToNext,
    nextDueDate,
  };
}

interface FleetStore {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  workOrders: WorkOrder[];
  simulationRunning: boolean;
  activeTcms: Record<string, TcmsEvent[]>; // trainId -> events
  // failure estimates
  expectedFailuresPerMonth: (type: Vehicle['type'], mileageKm: number) => number;
  expectedFailuresPerYear: (type: Vehicle['type'], mileageKm: number) => number;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  updateVehiclePosition: (id: string, position: Position) => void;
  updateVehicleMileage: (id: string, mileageKm: number) => void;
  createWorkOrder: (vehicleId: string, type: MaintenanceType) => void;
  addTcmsEvent: (e: TcmsEvent) => void;
  clearTcmsEvent: (trainId: string, code: string) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  calculateKPIs: () => KPIs;
}

function initializeFleet(): Vehicle[] {
  // Seed per provided subfleet assumptions
  // BY: 78 units → 22 FLIRT3 (Allgäu), 44 MIREO (Los 1), 12 DESIRO_HC (Los 1)
  // BW: 66 units → FLIRT3
  const vehicles: Vehicle[] = [];

  const byFlirtCount = 22;
  const byMireoCount = 44;
  const byDesiroCount = 12;

  const bwStartId = 66001;
  const bwEndId = 66066;
  const byStartId = 78001;
  const byEndId = 78078;

  function rnd(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min));
  }

  function makeVehicle(
    id: string,
    type: Vehicle['type'],
    region: 'BW' | 'BY',
    depot: Vehicle['depot'],
    commissioningISO: string,
    mileageRange: [number, number],
    line?: string
  ): Vehicle {
    const commissioning = new Date(commissioningISO);
    const v: Vehicle = {
      id,
      type,
      operator: region === 'BW' ? 'Arverio BW' : 'Arverio BY',
      line,
      depot,
      status: 'OPERATIONAL',
      position: generateInitialPosition(line),
      heading: Math.random() * 360,
      speed: 0,
      delay: 0,
      mileageKm: rnd(mileageRange[0], mileageRange[1]),
      commissioningDate: commissioning,
    };
    return computeDueFields(v);
  }

  // BW Stuttgart FLIRT (66): range [750k, 1.15M]
  for (let n = bwStartId; n <= bwEndId; n++) {
    const id = String(n);
    const line = ['RE1', 'RE8', 'RE90', 'MEX13', 'MEX16'][n % 5];
    vehicles.push(
      makeVehicle(id, 'FLIRT3', 'BW', 'ESS', '2019-06-09T00:00:00Z', [750000, 1150000], line)
    );
  }

  // BY: 78 units
  const byIds: number[] = [];
  for (let n = byStartId; n <= byEndId; n++) byIds.push(n);
  // deterministic-ish assignment by order
  const byFlirtIds = byIds.slice(0, byFlirtCount);
  const byMireoIds = byIds.slice(byFlirtCount, byFlirtCount + byMireoCount);
  const byDesiroIds = byIds.slice(byFlirtCount + byMireoCount);

  // BY FLIRT (Allgäu): [350k, 520k]
  for (const n of byFlirtIds) {
    const id = String(n);
    const line = ['RE72', 'RE96', 'RB92'][n % 3];
    vehicles.push(
      makeVehicle(id, 'FLIRT3', 'BY', 'GAB', '2021-12-12T00:00:00Z', [350000, 520000], line)
    );
  }

  // BY MIREO (Los 1): [300k, 420k]
  for (const n of byMireoIds) {
    const id = String(n);
    const line = ['RE9', 'RE80', 'RB86', 'RB87', 'RB89'][n % 5];
    vehicles.push(
      makeVehicle(id, 'MIREO', 'BY', 'GAB', '2022-12-11T00:00:00Z', [300000, 420000], line)
    );
  }

  // BY DESIRO_HC (Los 1): [300k, 420k]
  for (const n of byDesiroIds) {
    const id = String(n);
    const line = ['RE9', 'RE80'][n % 2];
    vehicles.push(
      makeVehicle(id, 'DESIRO_HC', 'BY', 'GAB', '2022-12-11T00:00:00Z', [300000, 420000], line)
    );
  }

  return vehicles;
}

function generateInitialPosition(line?: string): Position {
  const byDefault: Position = { lat: 48.7847, lon: 9.1829 };
  if (!line) return byDefault;
  switch (line) {
    case 'RE1':
      return { lat: 48.7847, lon: 9.1829 };
    case 'RE8':
      return { lat: 49.0, lon: 9.7 };
    case 'RE90':
      return { lat: 49.1, lon: 9.6 };
    case 'MEX13':
      return { lat: 48.8, lon: 9.9 };
    case 'MEX16':
      return { lat: 48.7, lon: 9.8 };
    case 'RE9':
      return { lat: 48.3653, lon: 10.8856 };
    default:
      return byDefault;
  }
}

function calculateMTBF(vehicles: Vehicle[]): number {
  return 15000;
} // simplified placeholder
function calculateMTTR(workOrders: WorkOrder[]): number {
  return 3.5;
} // hours placeholder
function calculateFTFR(workOrders: WorkOrder[]): number {
  return 92.3;
}

export const useFleetStore = create<FleetStore>()(
  devtools((set, get) => ({
    vehicles: initializeFleet(),
    selectedVehicle: null,
    workOrders: [],
    simulationRunning: false,
    activeTcms: {},
    expectedFailuresPerMonth: (type, mileageKm) => {
      const fam = String(type || '').toUpperCase();
      const common = FAILURE_RATES_PER_10K_KM.common as any;
      const spec = (FAILURE_RATES_PER_10K_KM.specific as any)[fam] || {};
      const per10k = { ...common, ...spec } as Record<string, number>;
      const factor = mileageKm / 10000;
      const sum = Object.values(per10k).reduce((a, b) => a + b, 0);
      return (sum * factor) / 12;
    },
    expectedFailuresPerYear: (type, mileageKm) => {
      const fam = String(type || '').toUpperCase();
      const common = FAILURE_RATES_PER_10K_KM.common as any;
      const spec = (FAILURE_RATES_PER_10K_KM.specific as any)[fam] || {};
      const per10k = { ...common, ...spec } as Record<string, number>;
      const factor = mileageKm / 10000;
      const sum = Object.values(per10k).reduce((a, b) => a + b, 0);
      return sum * factor;
    },
    setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
    updateVehiclePosition: (id, position) =>
      set((state) => ({
        vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, position } : v)),
      })),
    updateVehicleMileage: (id, mileageKm) =>
      set((state) => ({
        vehicles: state.vehicles.map((v) =>
          v.id === id ? computeDueFields({ ...v, mileageKm }) : v
        ),
      })),
    createWorkOrder: (vehicleId, type) => {
      const vehicle = get().vehicles.find((v) => v.id === vehicleId);
      if (!vehicle) return;
      const wo: WorkOrder = {
        id: `WO-${Date.now()}`,
        vehicleId,
        type,
        status: 'DRAFT',
        createdAt: new Date(),
        depot: vehicle.depot,
        estimatedDuration: 4,
      };
      set((state) => ({ workOrders: [...state.workOrders, wo] }));
    },
    addTcmsEvent: (e) =>
      set((state) => {
        const list = state.activeTcms[e.trainId] ?? [];
        const next = [...list.filter((x) => x.code !== e.code), e];
        return { activeTcms: { ...state.activeTcms, [e.trainId]: next } } as Partial<FleetStore>;
      }),
    clearTcmsEvent: (trainId, code) =>
      set((state) => {
        const list = (state.activeTcms[trainId] ?? []).filter((x) => x.code !== code);
        return { activeTcms: { ...state.activeTcms, [trainId]: list } } as Partial<FleetStore>;
      }),
    startSimulation: () => set({ simulationRunning: true }),
    stopSimulation: () => set({ simulationRunning: false }),
    calculateKPIs: () => {
      const state = get();
      const operational = state.vehicles.filter((v) => v.status === 'OPERATIONAL').length;
      const total = Math.max(1, state.vehicles.length);
      return {
        availability: (operational / total) * 100,
        mtbf: calculateMTBF(state.vehicles),
        mttr: calculateMTTR(state.workOrders),
        firstTimeFixRate: calculateFTFR(state.workOrders),
        complianceScore: 100,
      };
    },
  }))
);

// (duplicate helpers removed)
