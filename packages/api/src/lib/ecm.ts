import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export type EcmPolicy = {
  id: string;
  title: string;
  intervalDays?: number;
  thresholds?: { warnDays?: number };
  active: boolean;
};
export type EcmMeasure = {
  id: string;
  title: string;
  component?: string;
  defaultInterval?: number;
};
export type EcmWO = {
  id: string;
  trainId: string;
  title: string;
  dueDate: string;
  priority: 'P0' | 'P1' | 'P2';
  depotId: string;
  status: 'NEW' | 'PLANNED' | 'IN_PROGRESS' | 'QA' | 'DONE';
  checklist: Array<{ id: string; label: string; done: boolean }>;
  notes: Array<{ by: string; text: string; ts: string }>;
};
export type EcmSignoff = { id: string; policyId: string; author: string; ts: string };

const seedsDir = path.join(process.cwd(), 'seeds', 'ecm');
const f = (name: string) => path.join(seedsDir, name);

function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(f(name), 'utf-8'));
  } catch {
    return fallback;
  }
}
function writeJson(name: string, data: any) {
  if (!existsSync(seedsDir)) mkdirSync(seedsDir, { recursive: true });
  writeFileSync(f(name), JSON.stringify(data, null, 2));
}

export function loadPolicies(): EcmPolicy[] {
  return readJson('policies.json', [] as EcmPolicy[]);
}
export function savePolicies(p: EcmPolicy[]) {
  writeJson('policies.json', p);
}
export function loadMeasures(): EcmMeasure[] {
  return readJson('measures.json', [] as EcmMeasure[]);
}
export function loadWOs(): EcmWO[] {
  return readJson('workorders.json', [] as EcmWO[]);
}
export function saveWOs(arr: EcmWO[]) {
  writeJson('workorders.json', arr);
}
export function appendSignoff(s: EcmSignoff) {
  const list = readJson('signoffs.json', [] as EcmSignoff[]);
  list.push(s);
  writeJson('signoffs.json', list);
}

export function deriveCompliance(dueDateISO?: string) {
  if (!dueDateISO) return 'OK' as const;
  const today = Date.now();
  const due = Date.parse(dueDateISO);
  const diffDays = Math.floor((due - today) / (24 * 3600 * 1000));
  if (diffDays < 0) return 'OVERDUE' as const;
  if (diffDays <= 7) return 'DUE_SOON' as const;
  return 'OK' as const;
}

// Simple depot capacity heuristic: max N per day per depot
export function computeDepotSlotWarnings(
  wos: EcmWO[],
  maxPerDayPerDepot = 5
): Array<{ depotId: string; date: string; count: number; warning: boolean }> {
  const map = new Map<string, number>();
  for (const w of wos) {
    const day = new Date(w.dueDate);
    day.setHours(0, 0, 0, 0);
    const key = `${w.depotId}|${day.toISOString()}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const out: Array<{ depotId: string; date: string; count: number; warning: boolean }> = [];
  for (const [key, count] of map.entries()) {
    const [depotId, date] = key.split('|');
    out.push({ depotId, date, count, warning: count > maxPerDayPerDepot });
  }
  return out;
}
