// apps/web/app/api/events/route.ts
import { API_UPSTREAM } from '@/lib/config';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET() {
  try {
    const r = await fetch(`${API_UPSTREAM}/events`, { cache: 'no-store' });
    if (r.ok && r.body)
      return new Response(r.body, {
        headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' },
      });
  } catch {}
  const { readable, writable } = new TransformStream();
  const w = writable.getWriter();
  const enc = new TextEncoder();
  const ping = () => w.write(enc.encode('event: ping\ndata: {}\n\n'));
  const id = setInterval(ping, 5000);
  ping();
  return new Response(readable, {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' },
  });
}
