'use client';

import { useEffect, useRef } from 'react';
import { useSimStore } from '@/lib/sim/store';
import maplibregl from 'maplibre-gl';

function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t];
}

export function LiveSimLayer({ map }: { map: maplibregl.Map | null }) {
  const { lines, vehicles, buildLinesFromDataset, allocateFleet, start } = useSimStore();
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  // bootstrap demo data (until real timetable caches are present)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__liveSimLayer = 'mounted';
    }
    buildLinesFromDataset();
    allocateFleet();
    start();
  }, [buildLinesFromDataset, allocateFleet, start]);

  // draw polylines for all known lines (prefer fetched railmaps)
  useEffect(() => {
    if (!map) return;
    const draw = () => {
      Object.values(lines).forEach((line) => {
        const id = `line-${line.id}`;
        const ensureLayer = (data: any) => {
          if (!map.getSource(id)) {
            map.addSource(id, { type: 'geojson', data });
            map.addLayer({
              id,
              type: 'line',
              source: id,
              paint: { 'line-color': line.color, 'line-width': 2 },
            });
          } else {
            (map.getSource(id) as any).setData(data);
          }
        };
        fetch(`/api/railmaps/${encodeURIComponent(line.id)}`)
          .then((r) => r.json())
          .then((fc) => {
            if (fc && fc.features && fc.features.length) ensureLayer(fc);
            else
              ensureLayer({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: line.coords },
                properties: {},
              });
          })
          .catch(() =>
            ensureLayer({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: line.coords },
              properties: {},
            })
          );
      });
    };
    if (map.isStyleLoaded()) draw();
    else map.once('load', draw);
  }, [map, lines]);

  // render vehicle markers from sim store
  useEffect(() => {
    if (!map) return;
    const getPointOnLine = (lineId: string, prog: number): [number, number] | null => {
      const src = map.getSource(`line-${lineId}`) as any;
      const data = src && (src.serialize?.().data || src._data);
      let coords: [number, number][] = [];
      if (data?.type === 'FeatureCollection') {
        for (const f of data.features)
          if (f.geometry?.type === 'LineString') coords.push(...f.geometry.coordinates);
      } else if (data?.type === 'Feature' && data.geometry?.type === 'LineString') {
        coords = data.geometry.coordinates;
      } else {
        coords = lines[lineId]?.coords ?? [];
      }
      if (coords.length < 2) return null;
      const n = coords.length - 1;
      const f = Math.min(n - 1e-6, Math.max(0, prog)) * n;
      const i = Math.floor(f);
      const t = f - i;
      return lerp(coords[i], coords[i + 1], t);
    };

    // remove vanished markers
    const ids = new Set(vehicles.map((v) => v.id));
    markersRef.current.forEach((m, id) => {
      if (!ids.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    });

    // upsert markers
    for (const v of vehicles) {
      const pos = getPointOnLine(v.lineId, v.progress);
      if (!pos) continue;
      let marker = markersRef.current.get(v.id);
      const color =
        v.status === 'active'
          ? '#10b981'
          : v.status === 'maintenance'
            ? '#f59e0b'
            : v.status === 'offline'
              ? '#6b7280'
              : '#ef4444';
      if (!marker) {
        const el = document.createElement('div');
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.borderRadius = '50%';
        el.style.background = color;
        el.style.border = '2px solid white';
        marker = new maplibregl.Marker({ element: el }).setLngLat(pos);
        marker.addTo(map);
        markersRef.current.set(v.id, marker);
      } else {
        (marker.getElement().style as any).background = color;
        marker.setLngLat(pos);
      }
    }

    return () => {
      // markers persist across rerenders intentionally
    };
  }, [map, vehicles, lines]);

  return null;
}
