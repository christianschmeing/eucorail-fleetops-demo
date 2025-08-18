import { upstreamJson } from '../../_lib/upstream';
export async function GET() {
  return upstreamJson('/api/metrics/kpi', {
    availabilityPct: 97.2,
    overdueCount: 0,
    woAgingMedianDays: 0,
    depotUtilToday: 0,
    fleetSize: 0,
    fallback: true,
  });
}
