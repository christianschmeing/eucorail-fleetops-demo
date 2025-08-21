'use client';

// Slim client MapLibre map (clean file)
import React, { useEffect, useRef } from 'react';
import maplibregl, { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Track } from '@/types/depot';
import type { Allocation } from '../depot-data';
import type { TrackGeometry } from '../track-geometries';
import { loadDepotTracks } from '@/lib/depots/tracks';
import { useFleetStore } from '@/lib/state/fleet-store';

interface Props {
  depot: 'Essingen' | 'Langweid';
  tracks?: TrackGeometry[];
  allocations?: Allocation[];
}

export default function DepotMapGL({ depot, tracks, allocations = [] }: Props) {
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const activeTcms = useFleetStore((s) => s.activeTcms);

  useEffect(() => {
    if (!containerRef.current) return;
    mapRef.current?.remove();
    const center: [number, number] =
      depot === 'Essingen'
        ? ([9.9574, 48.6295] as [number, number])
        : ([10.8539, 48.4894] as [number, number]);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      } as any,
      center,
      zoom: 16,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    (async () => {
      let features: any[] = [];
      if (Array.isArray(tracks) && tracks.length) {
        const occ = new Set((allocations || []).map((a) => a.trackId));
        features = tracks.map((t) => ({
          type: 'Feature',
          properties: {
            id: t.id,
            type: (t as any).type ?? 'yard',
            color:
              (t as any).state === 'gesperrt' || (t as any).state === 'defekt'
                ? '#6b7280'
                : occ.has(t.id) || (t as any).state === 'belegt'
                  ? '#eab308'
                  : '#10b981',
          },
          geometry: t.geometry,
        }));
      } else {
        const loaded: Track[] = await loadDepotTracks(depot);
        features = loaded.map((t) => ({
          type: 'Feature',
          properties: { id: t.id, type: t.type, color: '#424242' },
          geometry: t.geometry,
        }));
      }
      const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features } as any;
      map.once('load', () => {
        if (!map.getSource('depot-tracks')) {
          map.addSource('depot-tracks', { type: 'geojson', data: fc });
          map.addLayer({
            id: 'depot-tracks-line',
            type: 'line',
            source: 'depot-tracks',
            paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': 0.85 },
          });
        } else {
          (map.getSource('depot-tracks') as maplibregl.GeoJSONSource).setData(fc as any);
        }
      });
    })();

    return () => map.remove();
  }, [depot, tracks, allocations]);

  // markers for allocations
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (!tracks || !allocations || allocations.length === 0) return;
    const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [
      a[0] * (1 - t) + b[0] * t,
      a[1] * (1 - t) + b[1] * t,
    ];
    for (const a of allocations) {
      const tr = (tracks as any).find((t: any) => t.id === a.trackId);
      if (!tr) continue;
      const coords: [number, number][] = tr.geometry.coordinates as any;
      const idx = Math.max(
        0,
        Math.min(
          coords.length - 2,
          Math.floor(((a.offsetM || 0) / Math.max(1, tr.lengthM)) * (coords.length - 1))
        )
      );
      const t = ((a.offsetM || 0) / Math.max(1, tr.lengthM)) * (coords.length - 1) - idx;
      const pos = lerp(coords[idx], coords[idx + 1] || coords[idx], t);
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #fff';
      // Status-gesteuerte Farbe: geplant (hellblau), aktiv/maintenance (gelb), alarm (rot)
      el.style.background =
        a.status === 'planned'
          ? '#60a5fa'
          : String(a.purpose || '').toLowerCase() === 'corrective'
            ? '#ef4444'
            : a.purpose === 'ARA'
              ? '#eab308'
              : a.purpose === 'Korr'
                ? '#f97316'
                : String(a.purpose || '').startsWith('IS')
                  ? '#eab308'
                  : '#ef4444';
      const startsInMs = new Date(a.startPlanned).getTime() - Date.now();
      const startsInMin = Math.round(startsInMs / 60000);
      const info = `Start: ${new Date(a.startPlanned).toLocaleString('de-DE')}`;
      const info2 = `Ende: ${new Date(a.endPlanned).toLocaleString('de-DE')}`;
      const info3 = `Beginnt in: ${startsInMin} min`;
      const tcms = (activeTcms as any)[a.train_id] || [];
      const tcmsTop = tcms
        .slice(0, 2)
        .map((e: any) => `${e.severity}: ${e.humanMessage}`)
        .join('\n');
      el.title = `${a.train_id} – ${a.purpose}\n${info}\n${info2}\n${info3}${tcmsTop ? `\nTCMS: ${tcmsTop}` : ''}`;
      const marker = new maplibregl.Marker({ element: el }).setLngLat(pos as any).addTo(map);
      markersRef.current.push(marker);
    }
  }, [allocations, tracks]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
