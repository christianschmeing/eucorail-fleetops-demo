import { API_UPSTREAM, REQ_TIMEOUT_MS } from '@/lib/config';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(req: Request) {
  const u = new URL(req.url);
  const format = u.searchParams.get('format') || 'xlsx';
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort('timeout'), REQ_TIMEOUT_MS);
    const r = await fetch(`${API_UPSTREAM}/api/export/trains?format=${format}`, {
      signal: c.signal,
      cache: 'no-store',
    });
    clearTimeout(t);
    if (r.ok)
      return new Response(r.body, {
        headers: {
          'content-type':
            r.headers.get('content-type') ||
            (format === 'xlsx'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'text/csv'),
        },
      });
  } catch {}
  return new Response('', {
    headers: {
      'content-type':
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
}
