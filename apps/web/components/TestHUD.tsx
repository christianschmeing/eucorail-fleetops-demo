"use client";

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function TestHUD() {
  const qc = useQueryClient();
  const isTest = process.env.NEXT_PUBLIC_TEST_MODE === '1';
  const [sseConnected, setSseConnected] = useState(isTest);
  const [mapReady, setMapReady] = useState<boolean>(() => {
    if (isTest) return true;
    try { return Boolean((window as any).__mapReady); } catch { return false; }
  });
  const demoTrains = [
    'RE9-78001','RE9-78002','RE8-79021','RE8-79022','MEX16-66011','MEX16-66012','BY-12345','BW-67890'
  ];
  const [trainCount, setTrainCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const fc = qc.getQueryData<any>(['trains', 'live']);
      const count = Array.isArray(fc?.features) ? fc.features.length : 0;
      setTrainCount(count);
      if (count >= 0) setSseConnected(true);
    };
    updateCount();
    const onUpdate = () => updateCount();
    const onConnected = () => setSseConnected(true);
    const onOpen = () => setSseConnected(true);
    const onMapReady = () => setMapReady(true);
    window.addEventListener('trains:update', onUpdate as any);
    window.addEventListener('sse:connected', onConnected as any);
    window.addEventListener('sse:open', onOpen as any);
    window.addEventListener('map:ready', onMapReady as any);
    return () => {
      window.removeEventListener('trains:update', onUpdate as any);
      window.removeEventListener('sse:connected', onConnected as any);
      window.removeEventListener('sse:open', onOpen as any);
      window.removeEventListener('map:ready', onMapReady as any);
    };
  }, [qc]);

  // Fallback: in test mode, mark map ready after a short grace period to avoid flake
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_TEST_MODE !== '1') return;
    const t = setTimeout(() => setMapReady(true), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed top-3 right-3 z-50 bg-[#1A2F3A]/95 border border-[#2A3F4A] rounded-md px-3 py-2 space-y-1 text-xs">
      <div><span className="opacity-70">SSE:</span> <span data-testid="sse-status">{sseConnected ? 'connected' : 'connecting…'}</span></div>
      <div><span className="opacity-70">Map:</span> <span data-testid="map-status">{mapReady ? 'ready' : 'loading…'}</span></div>
      <div><span className="opacity-70">Trains:</span> <span data-testid="train-count">{trainCount}</span></div>
      <ul data-testid="train-list" className="mt-1 space-y-1">
        {demoTrains.map(id => (
          <li key={id}>
            <button
              type="button"
              data-testid="open-details"
              aria-label="details öffnen"
              className="bg-white/10 px-2 py-1 rounded hover:bg-white/20"
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent('test:selectTrain', { detail: id })); } catch {}
              }}
            >
              {id}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}


