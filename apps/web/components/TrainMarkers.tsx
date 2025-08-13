"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";
import { API_BASE } from "../app/api-proxy";

type LocationEvt = {
  type: "location";
  runId: string;
  line: string;
  ts: number;
  lon: number;
  lat: number;
  speed: number;
};

export function TrainMarkers({ map }: { map: Map | null }) {
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const hasCenteredRef = useRef<boolean>(false);

  useEffect(() => {
    if (!map) return;

    let active: EventSource | null = null;
    let fallbackStarted = false;
    let readyReceived = false;
    let firstLocationReceived = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const connect = (url: string) => {
      const src = new EventSource(url);
      const onOpen = () => console.log('[SSE] open', url);
      const onError = (e: Event) => console.warn('[SSE] error', url, e);
      const onReady = (ev: MessageEvent) => {
        readyReceived = true;
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        console.log('[SSE] ready', url, ev.data);
      };
      const onLocation = (ev: MessageEvent) => {
      try {
        const loc = JSON.parse(ev.data) as LocationEvt;
          firstLocationReceived = true;
          // Center map on first incoming location to ensure visibility
          if (!hasCenteredRef.current && map) {
            hasCenteredRef.current = true;
            map.easeTo({ center: [loc.lon, loc.lat], zoom: 9, duration: 600 });
          }
        let marker = markersRef.current[loc.runId];
        if (!marker) {
          const el = document.createElement('div');
          el.setAttribute('data-testid', 'train-marker');
          el.className = 'w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 rounded-full bg-accent ring-2 ring-white/90 shadow-[0_0_0_2px_rgba(255,255,255,0.5)]';
          marker = new maplibregl.Marker({ element: el }).setLngLat([loc.lon, loc.lat]).addTo(map);
          markersRef.current[loc.runId] = marker;
        } else {
          marker.setLngLat([loc.lon, loc.lat]);
        }
      } catch {}
      };
      src.addEventListener('open', onOpen as EventListener);
      src.addEventListener('error', onError as EventListener);
      src.addEventListener('ready', onReady);
      src.addEventListener('location', onLocation);
      active = src;
      return () => {
        src.removeEventListener('open', onOpen as EventListener);
        src.removeEventListener('error', onError as EventListener);
        src.removeEventListener('ready', onReady);
        src.removeEventListener('location', onLocation as EventListener);
        src.close();
      };
    };

    // Try same-origin first (no CORS). Fallback to API_BASE if no ready/location within 3s.
    const disconnectPrimary = connect('/events');
    timeoutId = setTimeout(() => {
      // Fallback if no ready OR no first location within window
      if ((!readyReceived || !firstLocationReceived) && !fallbackStarted) {
        fallbackStarted = true;
        disconnectPrimary();
        try {
          const ws = new WebSocket(`${API_BASE.replace('http', 'ws')}/ws`);
          ws.onopen = () => console.log('[WS] open');
          ws.onmessage = (msg) => {
        try {
          const loc = JSON.parse(msg.data as string) as LocationEvt;
          if (!hasCenteredRef.current && map) {
            hasCenteredRef.current = true;
            map.easeTo({ center: [loc.lon, loc.lat], zoom: 9, duration: 600 });
          }
          let marker = markersRef.current[loc.runId];
          if (!marker) {
            const el = document.createElement('div');
            el.setAttribute('data-testid', 'train-marker');
            el.className = 'w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 rounded-full bg-accent ring-2 ring-white/90 shadow-[0_0_0_2px_rgba(255,255,255,0.5)]';
            marker = new maplibregl.Marker({ element: el }).setLngLat([loc.lon, loc.lat]).addTo(map);
            markersRef.current[loc.runId] = marker;
          } else {
            marker.setLngLat([loc.lon, loc.lat]);
          }
        } catch {}
          };
        } catch (e) {
          console.warn('[WS] failed', e);
        }
      }
    }, 3000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (active) active.close();
      disconnectPrimary();
    };
  }, [map]);

  return null;
}

