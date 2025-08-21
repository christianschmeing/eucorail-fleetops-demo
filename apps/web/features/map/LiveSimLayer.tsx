'use client';

import { useEffect, useRef } from 'react';
import { useSimStore } from '@/lib/sim/store';
import { useFleetStore } from '@/lib/state/fleet-store';
import maplibregl from 'maplibre-gl';

function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t];
}

export function LiveSimLayer({
  map,
  visibleLines,
}: {
  map: maplibregl.Map | null;
  visibleLines?: string[];
}) {
  const { lines, vehicles, buildLinesFromDataset, allocateFleet, start } = useSimStore();
  const activeTcms = useFleetStore((s) => s.activeTcms);
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

  // draw polylines for all known lines (prefer fetched railmaps) and toggle visibility by filter
  useEffect(() => {
    if (!map) return;
    const visible = visibleLines && visibleLines.length ? new Set(visibleLines) : null;
    const draw = () => {
      Object.values(lines).forEach((line) => {
        if (visible && !visible.has(line.id)) {
          // hide if exists
          const id = `line-${line.id}`;
          if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
          return;
        }
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
          } else if (map.getLayer(id)) {
            map.setLayoutProperty(id, 'visibility', 'visible');
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
  }, [map, lines, visibleLines]);

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

    // upsert markers, filter by visible lines if provided
    const include = (lineId: string) =>
      !visibleLines || visibleLines.length === 0 || visibleLines.includes(lineId);

    for (const v of vehicles) {
      if (!include(v.lineId)) continue;
      const pos = getPointOnLine(v.lineId, v.progress);
      if (!pos) continue;
      let marker = markersRef.current.get(v.id);
      // color by due status if known via fleet store
      const fs = (useFleetStore.getState().vehicles as any[]).find(
        (x) => String(x.id) === String(v.id)
      );
      let dueColor: string | null = null;
      if (fs && fs.kmToNext) {
        const fam = String(fs.type || '').toUpperCase();
        // consider nearest IS stage
        const stages: Array<'IS1' | 'IS2' | 'IS3' | 'IS4' | 'IS5' | 'IS6'> = [
          'IS1',
          'IS2',
          'IS3',
          'IS4',
          'IS5',
          'IS6',
        ];
        let best = Infinity;
        for (const st of stages) {
          const rem = fs.kmToNext[st] ?? Infinity;
          if (typeof rem === 'number' && rem < best) best = rem;
        }
        if (best < 5000) dueColor = '#ef4444';
        else if (best < 10000) dueColor = '#f59e0b';
        else dueColor = '#10b981';
      }
      const color =
        dueColor ||
        (v.status === 'active'
          ? '#10b981'
          : v.status === 'maintenance'
            ? '#f59e0b'
            : v.status === 'offline'
              ? '#6b7280'
              : '#ef4444');
      if (!marker) {
        const el = document.createElement('div');
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.borderRadius = '50%';
        el.style.background = color;
        el.style.border = '2px solid white';
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `Zug ${v.id}`);
        el.setAttribute('data-testid', 'train-marker');
        // TCMS badge
        const badge = document.createElement('div');
        badge.style.position = 'absolute';
        badge.style.top = '-6px';
        badge.style.right = '-6px';
        badge.style.minWidth = '14px';
        badge.style.height = '14px';
        badge.style.borderRadius = '8px';
        badge.style.fontSize = '9px';
        badge.style.lineHeight = '14px';
        badge.style.textAlign = 'center';
        badge.style.color = '#fff';
        badge.style.padding = '0 2px';
        badge.style.background = '#ef4444';
        badge.style.display = 'none';
        el.appendChild(badge);
        // open popup on hover with details
        const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true }).setHTML(
          `<div style="font: 12px/1.4 system-ui; min-width: 200px;">
             <div style="font-weight:600;">Zug ${v.id}</div>
             <div>Linie: ${v.lineId}</div>
             <div>Status: ${v.status}</div>
           </div>`
        );
        el.addEventListener('mouseenter', () => popup.setLngLat(pos).addTo(map));
        el.addEventListener('mouseleave', () => popup.remove());
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          window.location.href = `/trains/${encodeURIComponent(v.id)}`;
        });
        marker = new maplibregl.Marker({ element: el }).setLngLat(pos);
        marker.addTo(map);
        markersRef.current.set(v.id, marker);
      } else {
        (marker.getElement().style as any).background = color;
        marker.setLngLat(pos);
      }
      // Update tooltip + badge with TCMS info
      const digits = v.id.replace(/\D+/g, '');
      const evts = [...(activeTcms[v.id] || []), ...((digits && activeTcms[digits]) || [])];
      const alarms = evts.filter((e) => e.severity === 'ALARM' || e.severity === 'CRITICAL');
      const el = marker.getElement();
      const top3 = evts
        .slice(0, 3)
        .map((e) => `${e.severity}: ${e.humanMessage}`)
        .join('\n');
      el.title = top3 ? `${v.id} — ${top3}` : `Zug ${v.id}`;
      const badgeEl = el.children.item(0) as HTMLDivElement | null;
      if (badgeEl) {
        const count = alarms.length;
        if (count > 0) {
          badgeEl.textContent = String(count);
          badgeEl.style.display = 'block';
        } else {
          badgeEl.style.display = 'none';
        }
      }
    }

    return () => {
      // markers persist across rerenders intentionally
    };
  }, [map, vehicles, lines]);

  return null;
}
