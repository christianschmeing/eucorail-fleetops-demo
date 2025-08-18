import { API_UPSTREAM, REQ_TIMEOUT_MS } from '@/lib/config';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET() {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort('timeout'), REQ_TIMEOUT_MS);
    const r = await fetch(`${API_UPSTREAM}/api/export/lines`, {
      signal: c.signal,
      cache: 'no-store',
    });
    clearTimeout(t);
    if (r.ok)
      return new Response(r.body, {
        headers: { 'content-type': r.headers.get('content-type') || 'text/csv' },
      });
  } catch {}
  return new Response('id,name,status\n', { headers: { 'content-type': 'text/csv' } });
}

export async function HEAD() {
  return new Response(null, { headers: { 'content-type': 'text/csv; charset=utf-8' } });
}
