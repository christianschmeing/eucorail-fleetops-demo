export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Stage = 'IS1' | 'IS2' | 'IS3' | 'IS4' | 'IS5' | 'IS6';

type Train = {
  id: string;
  depot?: string;
  maintenanceInfo?: Record<
    string,
    {
      restKm: number;
      restDays: number;
    }
  >;
};

function bucket(restKm: number | undefined, restDays: number | undefined) {
  const km = typeof restKm === 'number' ? restKm : Number.POSITIVE_INFINITY;
  const d = typeof restDays === 'number' ? restDays : Number.POSITIVE_INFINITY;
  if (km <= 0 || d <= 0 || d <= 3) return 'critical';
  if (km <= 1000 || d <= 14) return 'warn';
  return 'ok';
}

export async function GET(request: Request) {
  try {
    // Prefer using existing trains API to avoid duplicating maintenance logic
    const base = new URL(request.url);
    base.pathname = '/api/trains';
    base.search = '';
    const res = await fetch(base.toString(), { cache: 'no-store' });
    const trains = (await res.json()) as Train[];

    const stages: Stage[] = ['IS1', 'IS2', 'IS3', 'IS4', 'IS5', 'IS6'];
    const counts: Record<Stage, { critical: number; warn: number; ok: number }> = {
      IS1: { critical: 0, warn: 0, ok: 0 },
      IS2: { critical: 0, warn: 0, ok: 0 },
      IS3: { critical: 0, warn: 0, ok: 0 },
      IS4: { critical: 0, warn: 0, ok: 0 },
      IS5: { critical: 0, warn: 0, ok: 0 },
      IS6: { critical: 0, warn: 0, ok: 0 },
    };

    type Row = { id: string; stage: Stage; kmToNext: number; daysToNext: number; depot: string };
    const rows: Row[] = [];

    for (const t of trains) {
      for (const st of stages) {
        const info = t.maintenanceInfo?.[st as any] as any;
        if (!info) continue;
        const b = bucket(info?.restKm, info?.restDays) as 'critical' | 'warn' | 'ok';
        counts[st][b] += 1;
        rows.push({
          id: t.id,
          stage: st,
          kmToNext: Math.max(0, Number(info?.restKm ?? 0)),
          daysToNext: Math.max(0, Number(info?.restDays ?? 0)),
          depot: t.depot || '-',
        });
      }
    }

    rows.sort((a, b) => {
      const aKey = Math.min(a.daysToNext, a.kmToNext / 100); // weight days higher
      const bKey = Math.min(b.daysToNext, b.kmToNext / 100);
      return aKey - bKey;
    });

    const top10 = rows.slice(0, 10);

    return new Response(JSON.stringify({ stages: counts, top10 }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (e) {
    // Keep UI resilient
    return new Response(
      JSON.stringify({
        stages: {
          IS1: { critical: 0, warn: 0, ok: 0 },
          IS2: { critical: 0, warn: 0, ok: 0 },
          IS3: { critical: 0, warn: 0, ok: 0 },
          IS4: { critical: 0, warn: 0, ok: 0 },
          IS5: { critical: 0, warn: 0, ok: 0 },
          IS6: { critical: 0, warn: 0, ok: 0 },
        },
        top10: [],
      }),
      { headers: { 'content-type': 'application/json' } }
    );
  }
}
