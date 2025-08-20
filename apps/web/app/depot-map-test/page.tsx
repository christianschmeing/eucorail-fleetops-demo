'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function DepotMapTestPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) {
      setError('Container not found');
      return;
    }

    try {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm-tiles-layer',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: [10.0000, 48.7995], // Essingen
        zoom: 16,
        pitch: 0,
        bearing: 0,
      });

      map.on('load', () => {
        console.log('Test map loaded successfully');
        setMapLoaded(true);
      });

      map.on('error', (e) => {
        console.error('Test map error:', e);
        setError(e.error?.message || 'Map error');
      });

      // Add test marker
      new maplibregl.Marker()
        .setLngLat([10.0000, 48.7995])
        .addTo(map);

      return () => {
        map.remove();
      };
    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-900">
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded shadow">
        <h1 className="text-xl font-bold">MapLibre GL Test</h1>
        <p>Status: {mapLoaded ? '✅ Loaded' : '⏳ Loading...'}</p>
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ minHeight: '100vh' }}
      />
    </div>
  );
}
