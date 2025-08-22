export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TcmsEvent = {
  id: string;
  ts: string;
  trainId: string;
  system: string;
  severity: 'INFO' | 'WARN' | 'ALARM' | 'CRITICAL';
  status: 'RAISED' | 'ACK' | 'CLEARED';
  humanMessage: string;
};

export async function GET(request: Request) {
  try {
    // use existing events endpoint; combine with any live buffer in future
    const url = new URL('/api/tcms/events', request.url);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const j = await res.json();
    const events: TcmsEvent[] = Array.isArray(j.events) ? (j.events as any) : [];
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const last24h = events.filter((e) => new Date(e.ts).getTime() >= since);

    const countsBySeverity = { INFO: 0, WARN: 0, ALARM: 0, CRITICAL: 0 } as Record<string, number>;
    const countsBySystem: Record<string, number> = {};
    const perTrain: Record<string, number> = {};
    for (const e of last24h) {
      countsBySeverity[e.severity] = (countsBySeverity[e.severity] || 0) + 1;
      countsBySystem[e.system] = (countsBySystem[e.system] || 0) + 1;
      perTrain[e.trainId] =
        (perTrain[e.trainId] || 0) +
        (e.severity === 'CRITICAL' ? 3 : e.severity === 'ALARM' ? 2 : 1);
    }
    const topTrains = Object.entries(perTrain)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([trainId, score]) => ({ trainId, score }));

    // return also recent active alerts prioritizing CRITICAL/ALARM
    const recent = [...last24h]
      .sort((a, b) => (a.ts || '').localeCompare(b.ts || ''))
      .reverse()
      .slice(0, 50);

    return new Response(JSON.stringify({ countsBySeverity, countsBySystem, topTrains, recent }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch {
    return new Response(
      JSON.stringify({
        countsBySeverity: { INFO: 0, WARN: 0, ALARM: 0, CRITICAL: 0 },
        countsBySystem: {},
        topTrains: [],
        recent: [],
      }),
      { headers: { 'content-type': 'application/json' } }
    );
  }
}
