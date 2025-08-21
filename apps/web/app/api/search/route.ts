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
    } catch {}
  }
  return new Response(JSON.stringify({ results: out.slice(0, 20) }), {
    headers: { 'content-type': 'application/json' },
  });
}
