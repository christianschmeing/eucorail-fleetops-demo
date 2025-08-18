import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { MaintenanceSystem } from './maintenance/index.js';
import {
  loadPolicies,
  savePolicies,
  loadMeasures,
  loadWOs,
  saveWOs,
  appendSignoff,
  computeDepotSlotWarnings,
} from './lib/ecm.js';
import { getDataSource } from './lib/data.js';

export async function registerRoutes(app: FastifyInstance) {
  const data = getDataSource();
  app.get('/api/health', async () => {
    return data.getHealth();
  });
  app.get('/api/meta/version', async () => ({ version: '0.1.0' }));
  app.get('/api/lines', async () => {
    return data.getLines();
  });
  app.get('/api/depots', async () => {
    return data.getDepots();
  });

  // Trains list and by id (seed-backed, optional demo augmentation)
  app.get('/api/trains', async (req: any) => {
    const { fleetId, lineId, status } = (req.query ?? {}) as Record<string, string | undefined>;
    const limitParam = Number((req.query?.limit ?? '').toString());
    return data.getTrains({
      fleetId,
      lineId,
      status,
      limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined,
    });
  });
  app.get('/api/trains/:id', async (req: any, reply) => {
    const id = String(req.params?.id ?? '');
    const t = await data.getTrainById(id);
    if (!t) return reply.code(404).send({ error: 'not_found' });
    return t;
  });
  // naive in-memory cache for static JSON files
  let unitsCache: any = null;
  const energyBudget = { dailyKwh: 125000, usedKwh: 0 };
  const maint = new MaintenanceSystem();
  app.get('/api/fleet/health', async () => ({
    alerts24h: [
      { code: 'DOOR_23', count: 5 },
      { code: 'HVAC_12', count: 3 },
    ],
    dueSoon: [
      { runId: 'RE9-78001', kmRemaining: 1800 },
      { runId: 'MEX16-66012', daysRemaining: 25 },
    ],
  }));
  app.get('/api/units', async () => {
    if (!unitsCache) unitsCache = JSON.parse(readFileSync('data/units.json', 'utf-8'));
    return unitsCache;
  });
  app.get('/api/energy/budget', async () => energyBudget);
  app.get('/api/maintenance/:trainId', async (req: any) => {
    const trainId = req.params.trainId as string;
    const fleet = JSON.parse(readFileSync('data/fleet.json', 'utf-8')) as Array<{
      runId: string;
      unitType: string;
    }>;
    const unitType = fleet.find((x) => x.runId === trainId)?.unitType ?? 'MIREO';
    const currentKm = (maint as any).hash ? (maint as any).hash(trainId) % 200000 : 50000;
    return {
      trainId,
      unitType,
      schedule: maint.generateMaintenanceSchedule(trainId, unitType, currentKm),
      next: maint.predictNextMaintenance(currentKm, unitType),
      wearPct: maint.calculateWearAndTear(5000 + (currentKm % 15000)),
      faults: maint.listCurrentFaults(trainId),
    };
  });

  // KPIs (lightweight demo numbers)
  app.get('/api/metrics/kpi', async () => data.getKPI());

  // CSV/XLSX export endpoints (simple demo content)
  app.get('/api/export/lines', async (req: any, reply) => {
    const lines = await data.getLines();
    const rows = [
      ['Line', 'Region', 'Operator'],
      ...lines.map((l) => [l.id ?? '', l.region ?? '', l.operator ?? '']),
    ];
    const csv = rows.map((r) => r.map((x) => String(x).replace(/,/g, ';')).join(',')).join('\n');
    reply.header('content-type', 'text/csv; charset=utf-8');
    return reply.send(csv);
  });
  app.get('/api/export/trains', async (req: any, reply) => {
    const trains = await data.getTrains();
    const header = [
      'FZ',
      'Slot',
      'UIC',
      'Linie',
      'Region',
      'Serie',
      'Hersteller',
      'Status',
      'Depot',
      'DepotName',
      'SCHED',
    ];
    const rows = [
      header,
      ...trains
        .slice(0, 2000)
        .map((t: any) => [
          t.id ?? '',
          t.slot ?? '',
          t.uic ?? '',
          t.lineId ?? t.line ?? '',
          t.region ?? '',
          t.series ?? '',
          t.maker ?? '',
          t.status ?? '',
          t.depot ?? '',
          t.depotName ?? '',
          String(Boolean(t.sched)),
        ]),
    ];
    const fmt = (req.query?.format || '').toString().toLowerCase();
    if (fmt === 'xlsx') {
      // Minimal XLSX via CSV for demo; still set content-type to xlsx
      const csv = rows.map((r) => r.map((x) => String(x).replace(/,/g, ';')).join(',')).join('\n');
      reply.header(
        'content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      return reply.send(csv);
    }
    const csv = rows.map((r) => r.map((x) => String(x).replace(/,/g, ';')).join(',')).join('\n');
    reply.header('content-type', 'text/csv; charset=utf-8');
    return reply.send(csv);
  });

  // ECM minimal endpoints
  app.get('/api/ecm/policies', async () => data.listPolicies());
  app.get('/api/ecm/signoffs', async () => {
    return data.listSignoffs();
  });
  app.post('/api/ecm/policies', async (req: any) => {
    const body = req.body as any;
    const all = await data.listPolicies();
    const idx = all.findIndex((p) => p.id === body.id);
    const next = [...all];
    if (idx >= 0) next[idx] = { ...all[idx], ...body };
    else next.push(body);
    return data.savePolicies(next);
  });
  app.get('/api/ecm/measures', async () => data.listMeasures());
  app.get('/api/ecm/wos', async () => data.listWOs());
  app.post('/api/ecm/wos', async (req: any) => data.createWO(req.body as any));
  app.patch('/api/ecm/wos/:id', async (req: any, reply) => {
    const id = String(req.params.id);
    const res = await data.updateWO(id, req.body as any);
    if ('error' in res) return reply.code(404).send(res);
    return res;
  });
  app.post('/api/ecm/signoff', async (req: any) =>
    data.appendSignoff({ ...(req.body as any), ts: new Date().toISOString() })
  );

  // Toggle checklist item
  app.patch('/api/ecm/wos/:id/checklist', async (req: any, reply) => {
    const id = String(req.params.id);
    const { itemId, done } = (req.body as any) || {};
    const res = await data.toggleChecklist(id, String(itemId), Boolean(done));
    if ('error' in res) return reply.code(404).send(res);
    return res;
  });

  // Complete + QA endpoint: sets DONE and appends audit entry
  app.post('/api/ecm/wos/:id/complete', async (req: any, reply) => {
    const id = String(req.params.id);
    const res = await data.completeWO(id);
    if ('error' in res) return reply.code(404).send(res);
    return res;
  });
}
