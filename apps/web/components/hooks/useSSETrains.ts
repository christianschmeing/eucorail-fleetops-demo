import { useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api-client';

export function useSSETrains() {
  const [trains, setTrains] = useState<any[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'polling'>(
    'connecting'
  );
  const esRef = useRef<EventSource | null>(null);
  const backoff = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const connect = () => {
      try {
        esRef.current = new EventSource('/api/events');
        esRef.current.onopen = () => {
          if (!cancelled) {
            setStatus('connected');
            backoff.current = 0;
          }
        };
        esRef.current.onmessage = (ev) => {
          try {
            const d = JSON.parse(ev.data);
            if (d?.runId) {
              setTrains((prev) => {
                const i = prev.findIndex((p) => p.runId === d.runId);
                if (i >= 0) {
                  const c = prev.slice();
                  c[i] = { ...c[i], ...d };
                  return c;
                }
                return [...prev, d];
              });
            }
          } catch {}
        };
        esRef.current.onerror = () => {
          esRef.current?.close();
          if (!cancelled) {
            setStatus('reconnecting');
            backoff.current = Math.min(30000, (backoff.current || 1000) * 2);
            setTimeout(connect, backoff.current);
          }
        };
      } catch {
        setStatus('polling');
      }
    };
    connect();

    const poll = setInterval(async () => {
      if (status !== 'connected') {
        const r = await apiGet<any>('/trains?limit=500');
        if (r.ok && Array.isArray((r.data as any).items)) setTrains((r.data as any).items);
      }
    }, 5000);

    return () => {
      cancelled = true;
      esRef.current?.close();
      clearInterval(poll);
    };
  }, [status]);

  return { trains, status };
}

export function useLivePositions(onData: (payload: any) => void) {
	const esRef = useRef<EventSource | null>(null);
	useEffect(() => {
		let retryTimer: any = null;
		const connect = () => {
			try {
				const es = new EventSource('/api/positions/stream');
				esRef.current = es;
				es.onmessage = (e) => {
					try {
						const data = JSON.parse(e.data);
						onData?.(data);
					} catch {}
				};
				es.onerror = () => {
					es.close();
					esRef.current = null;
					// fallback snapshot immediately
					fetch('/api/positions/snapshot').then((r) => r.json()).then(onData).catch(() => {});
					retryTimer = setTimeout(connect, 1500);
				};
			} catch {
				retryTimer = setTimeout(connect, 1500);
			}
		};
		connect();
		return () => {
			if (retryTimer) clearTimeout(retryTimer);
			if (esRef.current) esRef.current.close();
		};
	}, [onData]);
}
