import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import fleetData from '@/data/arverio-fleet-real.json';
import { ECM_PROFILES, FAILURE_RATES_PER_10K_KM } from '@/lib/maintenance/ecm-profiles';

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
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  updateVehiclePosition: (id: string, position: Position) => void;
  updateVehicleMileage: (id: string, mileageKm: number) => void;
  createWorkOrder: (vehicleId: string, type: MaintenanceType) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  calculateKPIs: () => KPIs;
}

function initializeFleet(): Vehicle[] {
  const vf = (fleetData as any).vehicles as any[];
  const vehicles = vf.map((v) => {
    const commissioning = new Date(
      Date.now() - (120 + Math.floor(Math.random() * 180)) * 24 * 60 * 60 * 1000
    );
    const base: Vehicle = {
      id: v.id,
      type: v.type,
      operator: v.operator,
      line: v.line,
      depot: v.depot,
      status: (v.status as any) || 'OPERATIONAL',
      position: generateInitialPosition(v.line),
      heading: Math.random() * 360,
      speed: 0,
      delay: 0,
      mileageKm: 50000 + Math.floor(Math.random() * 200000),
      commissioningDate: commissioning,
    };
    return computeDueFields(base);
  });
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
