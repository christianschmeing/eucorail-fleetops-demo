"use client";
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useSSETrains() {
  const qc = useQueryClient();
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';
    const es = new EventSource(`${base}/events`);
    const onUpdate = (ev: MessageEvent) => {
      try {
        const fc = JSON.parse(ev.data);
        qc.setQueryData(['trains', 'live'], fc);
        window.dispatchEvent(new CustomEvent('trains:update'));
      } catch {}
    };
    es.addEventListener('train:update', onUpdate as any);
    return () => {
      es.removeEventListener('train:update', onUpdate as any);
      es.close();
    };
  }, [qc]);
}


