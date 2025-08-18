import fs from 'node:fs';
import path from 'node:path';

export type VehicleRosterItem = {
  slot: string;
  fz_id: string;
  uic: string;
  series: string;
  region: 'BW' | 'BY';
  depot: string; // depot id
  status: 'active' | 'standby' | 'maintenance';
};

export type MergedTrain = {
  id: string;
  name: string;
  uic?: string;
  slot?: string;
  series?: string;
  region?: 'BW' | 'BY';
  depot?: string;
  status?: 'active' | 'standby' | 'maintenance';
  lineId?: string;
};

export function loadRoster(): VehicleRosterItem[] {
  const bw = fs.readFileSync(
    path.join(process.cwd(), 'packages/api/seeds/averio/vehicles_bw.csv'),
    'utf-8'
  );
  const by = fs.readFileSync(
    path.join(process.cwd(), 'packages/api/seeds/averio/vehicles_by.csv'),
    'utf-8'
  );
  const rows = [bw, by]
    .flatMap((txt) => txt.split(/\r?\n/).filter(Boolean))
    .filter((line) => !line.startsWith('slot,'));
  return rows.map((line) => {
    const [slot, fz_id, uic, series, region, depot, status] = line.split(',');
    return { slot, fz_id, uic, series, region: region as any, depot, status: status as any };
  });
}

export function mergeTrainsWithRoster(
  trains: Array<{ id: string; lineId?: string; line?: string }>,
  roster: VehicleRosterItem[]
): MergedTrain[] {
  const result: MergedTrain[] = [];
  const groupBySeries: Record<string, VehicleRosterItem[]> = {};
  for (const r of roster) {
    (groupBySeries[r.series] ||= []).push(r);
  }
  const bySeries = new Map<string, VehicleRosterItem[]>(Object.entries(groupBySeries));
  let idx = 0;
  for (const t of trains) {
    const line = String(t.lineId || t.line || '').toUpperCase();
    const guessSeries = line === 'RE9' ? '2462' : line === 'RE8' ? '1427' : '2463';
    const fallback = roster;
    const list = bySeries.get(guessSeries) || fallback; // prefer series by line region
    const v = list[idx % list.length];
    idx++;
    result.push({
      id: t.id,
      name: t.id,
      uic: v?.uic,
      slot: v?.slot,
      series: v?.series,
      region: v?.region,
      depot: v?.depot,
      status: v?.status,
      lineId: t.lineId || t.line,
    });
  }
  return result;
}
