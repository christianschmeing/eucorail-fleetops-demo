'use client';

import { useEffect } from 'react';
import { useSimStore } from '@/lib/sim/store';
import maplibregl from 'maplibre-gl';

export function LiveSimLayer({ map }: { map: maplibregl.Map | null }) {
  const { lines, vehicles, buildLinesFromDataset, allocateFleet, start } = useSimStore();

  useEffect(() => {
    buildLinesFromDataset();
    allocateFleet();
    start();
  }, [buildLinesFromDataset, allocateFleet, start]);

  useEffect(() => {
    if (!map) return;

    // draw polylines
    Object.values(lines).forEach((line) => {
      const id = `line-${line.id}`;
      if (map.getSource(id)) return;
      map.addSource(id, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: line.coords,
          },
          properties: {},
        } as any,
      });
      map.addLayer({
        id,
        type: 'line',
        source: id,
        paint: { 'line-color': line.color, 'line-width': 2 },
      });
    });
  }, [map, lines]);

  useEffect(() => {
    if (!map) return;
    // update a symbol layer per vehicle quickly via markers (simple approach)
    // Consumers should rely on SSR markers; this layer is supplemental demo of 144 sim trains
  }, [map, vehicles]);

  return null;
}
