export type ApiResult<T> = { ok: true; data: T } | { ok: false; data: null; error: string };

export async function apiGet<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api${path}`, { cache: 'no-store', ...init });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error('not-json');
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, data: null, error: e?.message || 'fetch-failed' };
  }
}
