'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import FleetDashboard from '@/components/FleetDashboard';

interface Train {
  id: string;
  runId: string;
  line: string;
  position: [number, number];
  speed: number;
  status: 'active' | 'maintenance' | 'alert';
  nextStop: string;
  delay: number;
}

interface LiveMapProps {
  trains: Train[];
  selectedTrain: Train | null;
  onTrainClick?: (train: Train) => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({ trains, selectedTrain, onTrainClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    if (!mapContainer.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [9.5, 48.8],
      zoom: 7,
      pitch: 0,
      bearing: 0,
    });
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    // Add clustered source/layers for performance at 144+ trains
    const onLoad = () => {
      if (!map.current) return;
      if (!map.current.getSource('trains')) {
        map.current.addSource('trains', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterRadius: 40,
          clusterMaxZoom: 14,
        } as any);
      }
      if (!map.current.getLayer('clusters')) {
        map.current.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'trains',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['step', ['get', 'point_count'], '#99c', 10, '#668', 50, '#446'],
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 22],
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-width': 2,
          },
        });
      }
      if (!map.current.getLayer('cluster-count')) {
        map.current.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'trains',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 12,
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          },
          paint: { 'text-color': '#111' },
        });
      }
      if (!map.current.getLayer('unclustered-point')) {
        map.current.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'trains',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 12,
            'circle-color': '#0ea5e9',
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 2,
          },
        });
      }
    };
    map.current.on('load', onLoad);
    return () => {
      try { map.current?.off('load', onLoad); } catch {}
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    // remove markers not present
    markers.current.forEach((marker, id) => {
      if (!trains.find((t) => t.id === id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });
    // add/update markers
    trains.forEach((train) => {
      let marker = markers.current.get(train.id);
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'train-marker';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.cursor = 'pointer';

        const color =
          train.status === 'active' ? '#10B981' : train.status === 'maintenance' ? '#F59E0B' : '#DC2626';

        el.innerHTML = `
          <div style="
            width: 32px;
            height: 32px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: white;
            font-weight: bold;
            position: relative;
            animation: pulse-operational 2.4s ease-in-out infinite;
          ">
            🚂
            ${train.delay > 0 ? `
              <div style="
                position: absolute;
                top: -8px;
                right: -8px;
                background: #DC2626;
                color: white;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                +${train.delay}
              </div>
            ` : ''}
          </div>
        `;

        el.addEventListener('click', () => onTrainClick?.(train));

        marker = new maplibregl.Marker({ element: el })
          .setLngLat(train.position)
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(`
              <div style="padding: 8px;">
                <strong>${train.line} ${train.id}</strong><br/>
                Geschwindigkeit: ${train.speed} km/h<br/>
                Nächster Halt: ${train.nextStop}<br/>
                Status: ${train.status}
              </div>
            `)
          );

        marker.addTo(map.current!);
        markers.current.set(train.id, marker);
      } else {
        marker.setLngLat(train.position);
      }
    });
  }, [trains, onTrainClick]);

  useEffect(() => {
    if (!map.current || !selectedTrain) return;
    map.current.flyTo({ center: selectedTrain.position, zoom: 12, duration: 1500 });
    const marker = markers.current.get(selectedTrain.id);
    marker?.togglePopup();
  }, [selectedTrain]);

  return (
    <div className="relative w-full h-full">
      <FleetDashboard />
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};


