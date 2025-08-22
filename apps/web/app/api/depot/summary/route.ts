export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Depot = 'Essingen' | 'Langweid';

export async function GET(request: Request) {
  try {
    // fetch planned allocations and track meta
    const base = new URL(request.url);
    base.pathname = '/api/depot/allocations';
    base.search = '';
    const r = await fetch(base.toString(), { cache: 'no-store' });
    const j = await r.json();
    const planned: Array<any> = Array.isArray(j.planned) ? j.planned : [];

    // track geometries are in app route import tree; query JSON via railmaps/depot as fallback
    const tracksRes = await fetch(new URL('/api/railmaps/depot', request.url), {
      cache: 'no-store',
    }).catch(() => null);
    const tracks =
      tracksRes && tracksRes.ok ? await tracksRes.json() : { Essingen: [], Langweid: [] };

    const depots: Depot[] = ['Essingen', 'Langweid'];
    const out: Record<
      Depot,
      { tracksTotal: number; inUse: number; plannedNext7d: number; conflicts: number }
    > = {
      Essingen: { tracksTotal: 0, inUse: 0, plannedNext7d: 0, conflicts: 0 },
      Langweid: { tracksTotal: 0, inUse: 0, plannedNext7d: 0, conflicts: 0 },
    } as any;

    for (const d of depots) {
      const t = (tracks as any)[d] || [];
      out[d].tracksTotal = t.length || 0;
      out[d].inUse = t.filter((x: any) => x.state === 'belegt').length;
      const now = Date.now();
      const in7d = now + 7 * 24 * 60 * 60 * 1000;
      out[d].plannedNext7d = planned.filter(
        (p) => p.home_depot === d && new Date(p.startPlanned).getTime() < in7d
      ).length;
      // naive conflict estimate: overlapping planned on same trackId within 7d
      const onD = planned.filter((p) => p.home_depot === d);
      let conf = 0;
      const byTrack: Record<string, any[]> = {};
      for (const p of onD) {
        const k = String(p.trackId);
        (byTrack[k] = byTrack[k] || []).push(p);
      }
      for (const list of Object.values(byTrack)) {
        list.sort(
          (a: any, b: any) =>
            new Date(a.startPlanned).getTime() - new Date(b.startPlanned).getTime()
        );
        for (let i = 1; i < list.length; i++) {
          const prev = list[i - 1] as any;
          const cur = list[i] as any;
          if (new Date(prev.endPlanned).getTime() > new Date(cur.startPlanned).getTime()) conf++;
        }
      }
      out[d].conflicts = conf;
    }

    return new Response(JSON.stringify(out), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch {
    return new Response(
      JSON.stringify({
        Essingen: { tracksTotal: 0, inUse: 0, plannedNext7d: 0, conflicts: 0 },
        Langweid: { tracksTotal: 0, inUse: 0, plannedNext7d: 0, conflicts: 0 },
      }),
      { headers: { 'content-type': 'application/json' } }
    );
  }
}
