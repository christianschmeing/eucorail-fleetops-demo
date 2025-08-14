"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";

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

    console.log('[TrainMarkers] Starting connection...');
    let cleanup: (() => void) | null = null;

    const connectSSE = () => {
      const eventSource = new EventSource('/events');
      
      eventSource.onopen = () => {
        console.log('[SSE] Connection opened');
      };

      eventSource.addEventListener('ready', (ev) => {
        console.log('[SSE] Ready event received:', ev.data);
      });

      eventSource.addEventListener('location', (ev) => {
        try {
          const loc = JSON.parse(ev.data) as LocationEvt;
          console.log('[SSE] Location received:', loc.runId);
          
          if (!hasCenteredRef.current && map) {
            hasCenteredRef.current = true;
            map.easeTo({ center: [loc.lon, loc.lat], zoom: 9, duration: 600 });
          }

          let marker = markersRef.current[loc.runId];
          if (!marker) {
            const el = document.createElement('div');
            el.setAttribute('data-testid', 'train-marker');
            el.className = 'train-marker';
            el.style.cssText = `
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background-color: #1E90FF;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            `;
            marker = new maplibregl.Marker({ element: el })
              .setLngLat([loc.lon, loc.lat])
              .addTo(map);
            markersRef.current[loc.runId] = marker;
            console.log('[SSE] Created new marker for', loc.runId);
          } else {
            marker.setLngLat([loc.lon, loc.lat]);
          }
        } catch (err) {
          console.error('[SSE] Error processing location:', err);
        }
      });

      eventSource.onerror = (err) => {
        console.error('[SSE] Connection error, retrying...', err);
        eventSource.close();
        setTimeout(connectSSE, 3000);
      };

      return () => {
        console.log('[SSE] Closing connection');
        eventSource.close();
      };
    };

    // Try SSE first
    cleanup = connectSSE();

    return () => {
      if (cleanup) cleanup();
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
    };
  }, [map]);

  return null;
}

