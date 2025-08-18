import { NextResponse } from 'next/server';
import { API_UPSTREAM, REQ_TIMEOUT_MS } from '@/lib/config';

export async function upstreamJson(path: string, fallback: any) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort('timeout'), REQ_TIMEOUT_MS);
    const r = await fetch(`${API_UPSTREAM}${path}`, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (r.ok && (r.headers.get('content-type') || '').includes('application/json')) {
      const data = await r.json();
      return NextResponse.json(data, { headers: { 'x-mode': 'upstream' } });
    }
  } catch {}
  return NextResponse.json(fallback, { headers: { 'x-mode': 'fallback' } });
}
