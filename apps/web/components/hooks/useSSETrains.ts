"use client";
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useSSETrains() {
  const qc = useQueryClient();
  useEffect(() => {
    // Direct connection to API to avoid proxy issues
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';
    const endpoint = `${base}/events`;
    const es = new EventSource(endpoint);
    es.onopen = () => {
      try { window.dispatchEvent(new CustomEvent('sse:open')); } catch {}
    };
    es.onerror = () => {
      try { window.dispatchEvent(new CustomEvent('sse:error')); } catch {}
    };
    let firstUpdateSeen = false;
    const onUpdate = (ev: MessageEvent) => {
      try {
        const fc = JSON.parse(ev.data);
        qc.setQueryData(['trains', 'live'], fc);
        window.dispatchEvent(new CustomEvent('trains:update'));
        if (!firstUpdateSeen) {
          firstUpdateSeen = true;
          try { window.dispatchEvent(new CustomEvent('sse:connected')); } catch {}
        }
      } catch {}
    };
    es.addEventListener('train:update', onUpdate as any);
    return () => {
      es.removeEventListener('train:update', onUpdate as any);
      es.close();
    };
  }, [qc]);
}


