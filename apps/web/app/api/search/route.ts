import arverioFleet from '@/data/arverio-fleet-real.json';
import { TCMS_TAXONOMY } from '@/lib/tcms/taxonomy';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const out: any[] = [];
  if (q) {
    try {
      const vehicles = (arverioFleet as any).vehicles as Array<any>;
      for (const v of vehicles || []) {
        const id = String(v.id || '').toLowerCase();
        const line = String(v.line || '').toLowerCase();
        if (id.includes(q) || line.includes(q)) {
          out.push({
            type: 'train',
            id: v.id,
            line: v.line,
            href: `/trains/${encodeURIComponent(v.id)}`,
          });
        }
      }
      // TCMS taxonomy search
      for (const [code, def] of Object.entries(TCMS_TAXONOMY)) {
        const hay = `${code} ${def.title} ${def.system}`.toLowerCase();
        if (hay.includes(q)) {
          out.push({
            type: 'tcms',
            code,
            title: def.title,
            system: def.system,
            href: `/maintenance`,
          });
        }
      }
      // Live TCMS events best-effort
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/tcms/events`, {
          cache: 'no-store',
        });
        if (r.ok) {
          const j = await r.json();
          const events = Array.isArray(j.events) ? j.events : [];
          for (const e of events) {
            const hay = `${e.code} ${e.humanMessage} ${e.system} ${e.trainId}`.toLowerCase();
            if (hay.includes(q)) {
              out.push({
                type: 'tcms_event',
                code: e.code,
                title: e.humanMessage || e.code,
                system: e.system,
                trainId: e.trainId,
                href: e.trainId ? `/trains/${encodeURIComponent(e.trainId)}` : `/maintenance`,
              });
            }
          }
        }
      } catch {}
    } catch {}
  }
  return new Response(JSON.stringify({ results: out.slice(0, 20) }), {
    headers: { 'content-type': 'application/json' },
  });
}
