import { getSpecForUnit, generateDoorFaults, MaintenanceLevel } from './models.js';

export type MaintenanceItem = {
  component: MaintenanceLevel | 'Wheelset';
  dueAtKm: number;
  lastServiceKm: number;
  status: 'ok' | 'due-soon' | 'overdue';
};

export class MaintenanceSystem {
  generateMaintenanceSchedule(trainId: string, unitType = 'MIREO', currentKm = 50000): MaintenanceItem[] {
    const spec = getSpecForUnit(unitType);
    const items: MaintenanceItem[] = [];
    if (spec) {
      for (const p of spec.policies) {
        const last = currentKm - Math.floor((currentKm % p.kmInterval));
        const due = last + p.kmInterval;
        const status = currentKm >= due ? 'overdue' : (due - currentKm) < p.kmInterval * 0.1 ? 'due-soon' : 'ok';
        items.push({ component: p.level, dueAtKm: due, lastServiceKm: last, status });
      }
    }
    // Add wheelset as illustrative long-interval item
    const base = this.hash(trainId) % 10000;
    items.push({ component: 'Wheelset', dueAtKm: 300000 + base, lastServiceKm: Math.max(0, currentKm - 40000), status: 'ok' });
    return items;
  }

  predictNextMaintenance(currentKm: number, unitType = 'MIREO'): { type: MaintenanceLevel; atKm: number } {
    const spec = getSpecForUnit(unitType);
    const first = spec?.policies[0];
    const interval = first?.kmInterval ?? 20000;
    const remainder = currentKm % interval;
    return { type: (first?.level ?? 'IS100') as MaintenanceLevel, atKm: currentKm + (interval - remainder) };
  }

  calculateWearAndTear(kmSinceService: number): number {
    const x = Math.max(0, kmSinceService / 20000);
    return Math.max(0, Math.min(100, Math.round(100 * (1 - Math.exp(-x)))));
  }

  listCurrentFaults(trainId: string) {
    return generateDoorFaults(this.hash(trainId));
  }

  private hash(str: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
}


