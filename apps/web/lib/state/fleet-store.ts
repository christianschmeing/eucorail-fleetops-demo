import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import fleetData from '@/data/arverio-fleet-real.json';

type MaintenanceType = 'IS1' | 'IS2' | 'IS3' | 'IS4' | 'WHEEL_LATHE';

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

interface FleetStore {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  workOrders: WorkOrder[];
  simulationRunning: boolean;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  updateVehiclePosition: (id: string, position: Position) => void;
  createWorkOrder: (vehicleId: string, type: MaintenanceType) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  calculateKPIs: () => KPIs;
}

function initializeFleet(): Vehicle[] {
  const vf = (fleetData as any).vehicles as any[];
  return vf.map((v) => ({
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
  }));
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
