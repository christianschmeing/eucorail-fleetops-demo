export type MaintenanceItem = {
  component: string;
  dueAtKm: number;
  lastServiceKm: number;
  status: 'ok' | 'due-soon' | 'overdue';
};

export class MaintenanceSystem {
  generateMaintenanceSchedule(trainId: string): MaintenanceItem[] {
    // Simple deterministic schedule based on trainId hash
    const base = this.hash(trainId) % 10000;
    return [
      { component: 'IS100', dueAtKm: 20000 + base, lastServiceKm: base, status: 'ok' },
      { component: 'IS600', dueAtKm: 120000 + base, lastServiceKm: base - 3000, status: 'due-soon' },
      { component: 'Wheelset', dueAtKm: 300000 + base, lastServiceKm: base - 10000, status: 'ok' }
    ];
  }

  predictNextMaintenance(currentKm: number): { type: string; atKm: number } {
    // Every 20k km small service
    const remainder = currentKm % 20000;
    return { type: 'IS100', atKm: currentKm + (20000 - remainder) };
  }

  calculateWearAndTear(kmSinceService: number): number {
    // Percent wear with diminishing slope
    const x = Math.max(0, kmSinceService / 20000);
    return Math.max(0, Math.min(100, Math.round(100 * (1 - Math.exp(-x)))));
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


