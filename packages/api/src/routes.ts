import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { MaintenanceSystem } from './maintenance/index.js';

export async function registerRoutes(app: FastifyInstance) {
  app.get('/api/lines', async () => {
    const p = path.join(process.cwd(), 'seeds', 'averio', 'lines.json');
    return JSON.parse(readFileSync(p, 'utf-8'));
  });
  app.get('/api/depots', async () => {
    const p = path.join(process.cwd(), 'seeds', 'core', 'depots.json');
    return JSON.parse(readFileSync(p, 'utf-8'));
  });
  // naive in-memory cache for static JSON files
  let unitsCache: any = null;
  let energyBudget = { dailyKwh: 125000, usedKwh: 0 };
  const maint = new MaintenanceSystem();
  app.get('/api/fleet/health', async () => ({
    alerts24h: [{ code: 'DOOR_23', count: 5 }, { code: 'HVAC_12', count: 3 }],
    dueSoon: [{ runId: 'RE9-78001', kmRemaining: 1800 }, { runId: 'MEX16-66012', daysRemaining: 25 }]
  }));
  app.get('/api/units', async () => {
    if (!unitsCache) unitsCache = JSON.parse(readFileSync('data/units.json', 'utf-8'));
    return unitsCache;
  });
  app.get('/api/energy/budget', async () => energyBudget);
  app.get('/api/maintenance/:trainId', async (req: any) => {
    const trainId = req.params.trainId as string;
    const fleet = JSON.parse(readFileSync('data/fleet.json', 'utf-8')) as Array<{ runId: string; unitType: string }>;
    const unitType = fleet.find((x) => x.runId === trainId)?.unitType ?? 'MIREO';
    const currentKm = (maint as any).hash ? (maint as any).hash(trainId) % 200000 : 50000;
    return {
      trainId,
      unitType,
      schedule: maint.generateMaintenanceSchedule(trainId, unitType, currentKm),
      next: maint.predictNextMaintenance(currentKm, unitType),
      wearPct: maint.calculateWearAndTear(5000 + (currentKm % 15000)),
      faults: maint.listCurrentFaults(trainId)
    };
  });
}

