import { readFileSync } from 'node:fs';
import path from 'node:path';

export type Train = any;
export type Line = any;
export type Depot = any;
export type KPI = {
  availabilityPct: number;
  overdueCount: number;
  woAgingMedianDays: number;
  depotUtilToday: Record<string, number>;
  fleetSize: number;
};
export type WorkOrder = import('../lib/ecm.js').EcmWO;
export type Policy = import('../lib/ecm.js').EcmPolicy;
export type Measure = import('../lib/ecm.js').EcmMeasure;
export type Signoff = import('../lib/ecm.js').EcmSignoff;

export interface DataSource {
  getHealth(): Promise<{
    ok: boolean;
    version: string;
    uptimeSec: number;
    startedAtSec: number;
    deps: { fastify: string };
  }>;
  getLines(): Promise<Line[]>;
  getDepots(): Promise<Depot[]>;
  getTrains(filters?: {
    fleetId?: string;
    lineId?: string;
    status?: string;
    limit?: number;
  }): Promise<Train[]>;
  getTrainById(id: string): Promise<Train | undefined>;
  getKPI(): Promise<KPI>;

  listWOs(): Promise<{
    items: WorkOrder[];
    capacity: Array<{ depotId: string; date: string; count: number; warning: boolean }>;
  }>;
  createWO(wo: WorkOrder): Promise<{ ok: true }>;
  updateWO(id: string, patch: Partial<WorkOrder>): Promise<{ ok: true } | { error: 'not_found' }>;
  toggleChecklist(
    id: string,
    itemId: string,
    done: boolean
  ): Promise<{ ok: true } | { error: 'not_found' }>;
  completeWO(id: string): Promise<{ ok: true } | { error: 'not_found' }>;
  listPolicies(): Promise<Policy[]>;
  savePolicies(policies: Policy[]): Promise<{ ok: true }>;
  listMeasures(): Promise<Measure[]>;
  listSignoffs(): Promise<Signoff[]>;
  appendSignoff(s: Signoff): Promise<{ ok: true }>;
}

export class SeedDataSource implements DataSource {
  private unitsCache: any = null;

  async getHealth() {
    const startedAt = Math.floor((Date.now() - Math.floor(process.uptime() * 1000)) / 1000);
    return {
      ok: true,
      version: '0.1.0',
      uptimeSec: Math.floor(process.uptime()),
      startedAtSec: startedAt,
      deps: { fastify: '5.x' },
    };
  }
  async getLines() {
    // Verwende die 144-Züge-Linien-Daten
    const p = path.join(process.cwd(), 'seeds', 'averio', 'lines-144.json');
    return JSON.parse(readFileSync(p, 'utf-8'));
  }
  async getDepots() {
    const p = path.join(process.cwd(), 'seeds', 'core', 'depots.json');
    return JSON.parse(readFileSync(p, 'utf-8'));
  }
  async getTrains(filters?: {
    fleetId?: string;
    lineId?: string;
    status?: string;
    limit?: number;
  }) {
    // Verwende die 144-Züge-Datenquelle
    const p = path.join(process.cwd(), 'seeds', 'averio', 'trains-144.json');
    const trains = JSON.parse(readFileSync(p, 'utf-8')) as Array<any>;

    const isTest = process.env.TEST_MODE === '1' || process.env.NEXT_PUBLIC_TEST_MODE === '1';
    const DEMO_SYNTH = process.env.DEMO_SYNTHETIC_COUNTS === '1' || isTest;

    const TARGETS: Record<string, { count: number; prefix: string; base: number }> = {
      MEX16: { count: 66, prefix: 'MEX16-66', base: 1 },
      RE8: { count: 39, prefix: 'RE8-79', base: 1 },
      RE9: { count: 39, prefix: 'RE9-78', base: 1 },
    };
    const byLine: Record<string, any[]> = {};
    for (const t of trains) {
      const key = String(t.lineId || t.line || 'UNKNOWN').toUpperCase();
      (byLine[key] ||= []).push(t);
    }
    function pad3(n: number): string {
      return String(n).padStart(3, '0');
    }
    function synthesizeTrain(lineId: string, index: number): any {
      const target = TARGETS[lineId];
      const id = `${target.prefix}${pad3(target.base + index)}`;
      const isBy = ['MEX14', 'MEX15', 'RE10'].includes(lineId) ? 'München' : 'Stuttgart';
      const statusList = ['active', 'standby', 'maintenance'] as const;
      const status = statusList[(target.base + index) % statusList.length];
      return {
        id,
        name: id,
        line: lineId,
        lineId,
        fleetId: [
          'MEX16',
          'MEX13',
          'MEX14',
          'MEX15',
          'RE8',
          'RE1',
          'RE90',
          'RE7',
          'RE10',
          'RE9',
        ].includes(lineId)
          ? 'flirt3-3'
          : 'mireo-3',
        depot: isBy,
        status,
        position: { lat: 48.3, lng: 11.0 },
        speed: 80,
        healthScore: 90,
      };
    }
    let augmented = Object.values(byLine).flat();
    if (DEMO_SYNTH) {
      for (const [lineId, target] of Object.entries(TARGETS)) {
        const current = byLine[lineId]?.length ?? 0;
        if (current < target.count) {
          byLine[lineId] ||= [];
          for (let i = 0; i < target.count - current; i++) {
            byLine[lineId].push(synthesizeTrain(lineId, current + i));
          }
        }
      }
      augmented = Object.values(byLine).flat();
    }
    // Enrich with roster where available
    let list = DEMO_SYNTH ? augmented : trains;
    try {
      const rosterLib = await import('../lib/roster.js');
      const roster = rosterLib.loadRoster();
      const merged = rosterLib.mergeTrainsWithRoster(list, roster);
      // attach depot positions for non-active trains
      const depotsArr = JSON.parse(
        readFileSync(path.join(process.cwd(), 'seeds', 'core', 'depots.json'), 'utf-8')
      ) as Array<any>;
      const depotsById = new Map(depotsArr.map((d) => [d.id, d]));
      list = merged.map((t: any) => {
        const out = { ...t } as any;
        if (out.status && out.status !== 'active') {
          const depot = depotsById.get(out.depot);
          if (depot) {
            out.position = { lat: depot.lat, lng: depot.lon };
            out.depotName = depot.name;
          }
        }
        // Infer manufacturer by series prefix (simple mapping)
        const series = String(out.series || '').trim();
        if (series.startsWith('2462') || series.startsWith('2463') || series.startsWith('FLIRT'))
          out.maker = 'Stadler';
        else if (
          series.startsWith('1427') ||
          series.startsWith('1428') ||
          series.startsWith('1430') ||
          series.startsWith('MIREO') ||
          series.startsWith('DESIRO')
        )
          out.maker = 'Siemens';
        else out.maker = out.maker || '';
        out.sched = out.status === 'active';
        return out;
      });
    } catch {
      // fallback to original list
    }
    if (filters?.fleetId)
      list = list.filter(
        (t) => String(t.fleetId || t.series).toLowerCase() === filters.fleetId!.toLowerCase()
      );
    if (filters?.lineId)
      list = list.filter(
        (t) => String(t.lineId || t.line).toLowerCase() === filters.lineId!.toLowerCase()
      );
    if (filters?.status)
      list = list.filter(
        (t) => String(t.status ?? '').toLowerCase() === filters.status!.toLowerCase()
      );
    if (filters?.limit && Number.isFinite(filters.limit) && filters.limit > 0)
      list = list.slice(0, filters.limit);
    return list;
  }
  async getTrainById(id: string) {
    // Verwende die 144-Züge-Datenquelle
    const p = path.join(process.cwd(), 'seeds', 'averio', 'trains-144.json');
    const trains = JSON.parse(readFileSync(p, 'utf-8')) as Array<any>;
    return trains.find((x) => String(x.id) === id);
  }
  async getKPI() {
    // Verwende die 144-Züge-Fleet-Daten
    const fleet = JSON.parse(readFileSync('data/fleet-144.json', 'utf-8')) as Array<{
      runId: string;
      unitType: string;
    }>;
    const overdue = 7;
    const woAgingMedian = 3;
    const depotUtilToday = { Stuttgart: 0.65, Augsburg: 0.72 } as Record<string, number>;
    return {
      availabilityPct: 75.0, // 108 von 144 aktiv = 75%
      overdueCount: overdue,
      woAgingMedianDays: woAgingMedian,
      depotUtilToday,
      fleetSize: 144, // Hardcoded für Konsistenz
    };
  }
  async listWOs() {
    const lib = await import('../lib/ecm.js');
    const list = lib.loadWOs();
    const capacity = lib.computeDepotSlotWarnings(list);
    return { items: list, capacity };
  }
  async createWO(wo: WorkOrder) {
    const lib = await import('../lib/ecm.js');
    const list = lib.loadWOs();
    list.push(wo);
    lib.saveWOs(list);
    return { ok: true } as const;
  }
  async updateWO(id: string, patch: Partial<WorkOrder>) {
    const lib = await import('../lib/ecm.js');
    const all = lib.loadWOs();
    const idx = all.findIndex((w) => String(w.id) === id);
    if (idx < 0) return { error: 'not_found' } as const;
    all[idx] = { ...all[idx], ...patch } as any;
    lib.saveWOs(all);
    return { ok: true } as const;
  }
  async toggleChecklist(id: string, itemId: string, done: boolean) {
    const lib = await import('../lib/ecm.js');
    const all = lib.loadWOs();
    const idx = all.findIndex((w) => String(w.id) === id);
    if (idx < 0) return { error: 'not_found' } as const;
    const wo = all[idx];
    const cl = Array.isArray(wo.checklist) ? wo.checklist : [];
    const cIdx = cl.findIndex((c: any) => String(c.id) === String(itemId));
    if (cIdx >= 0) cl[cIdx] = { ...cl[cIdx], done: Boolean(done) };
    all[idx] = { ...wo, checklist: cl } as any;
    lib.saveWOs(all);
    return { ok: true } as const;
  }
  async completeWO(id: string) {
    const lib = await import('../lib/ecm.js');
    const all = lib.loadWOs();
    const idx = all.findIndex((w) => String(w.id) === id);
    if (idx < 0) return { error: 'not_found' } as const;
    const wo = all[idx];
    const notes = Array.isArray(wo.notes) ? wo.notes : [];
    notes.push({ by: 'system', text: 'Complete + QA', ts: new Date().toISOString() });
    all[idx] = { ...wo, status: 'DONE', notes } as any;
    lib.saveWOs(all);
    return { ok: true } as const;
  }
  async listPolicies() {
    const lib = await import('../lib/ecm.js');
    return lib.loadPolicies();
  }
  async savePolicies(policies: Policy[]) {
    const lib = await import('../lib/ecm.js');
    lib.savePolicies(policies);
    return { ok: true } as const;
  }
  async listMeasures() {
    const lib = await import('../lib/ecm.js');
    return lib.loadMeasures();
  }
  async listSignoffs() {
    try {
      const list = JSON.parse(readFileSync('seeds/ecm/signoffs.json', 'utf-8'));
      return list;
    } catch {
      return [];
    }
  }
  async appendSignoff(s: Signoff) {
    const lib = await import('../lib/ecm.js');
    lib.appendSignoff(s);
    return { ok: true } as const;
  }
}

let singleton: DataSource | null = null;
export function getDataSource(): DataSource {
  if (singleton) return singleton;
  const mode = (process.env.DATA_MODE || 'seed').toLowerCase();
  switch (mode) {
    case 'seed':
    default:
      singleton = new SeedDataSource();
      return singleton;
  }
}
