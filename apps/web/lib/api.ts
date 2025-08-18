export function getApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE?.trim();
  return env && env.length > 0 ? env : '';
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, { ...init, cache: 'no-store' });
  if (res.status === 429) {
    try {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'warn',
            message: 'Rate limit erreicht. Bitte kurz warten und erneut versuchen.',
          },
        })
      );
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('telemetry', { detail: { type: 'rate_limit', url } }));
    } catch {}
    throw new Error(`GET ${url} -> 429`);
  }
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}
