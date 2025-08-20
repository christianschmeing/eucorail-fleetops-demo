'use client';

// Slim client MapLibre map (clean file)
import React, { useEffect, useRef } from 'react';
import maplibregl, { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Track } from '@/types/depot';
import { loadDepotTracks } from '@/lib/depots/tracks';

interface Props {
  depot: 'Essingen' | 'Langweid';
}

export default function DepotMapGL({ depot }: Props) {
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
      const tracks: Track[] = await loadDepotTracks(depot);
      const fc: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: tracks.map((t) => ({
          type: 'Feature',
          properties: { id: t.id, type: t.type },
          geometry: t.geometry,
        })),
      } as any;
      map.once('load', () => {
        map.addSource('depot-tracks', { type: 'geojson', data: fc });
        map.addLayer({
          id: 'depot-tracks-line',
          type: 'line',
          source: 'depot-tracks',
          paint: { 'line-color': '#424242', 'line-width': 4 },
        });
      });
    })();

    return () => map.remove();
  }, [depot]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
