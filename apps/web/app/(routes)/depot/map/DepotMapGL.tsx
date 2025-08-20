'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Allocation, MovePlan } from '../depot-data';
import type { TrackGeometry } from '../track-geometries';

type DepotId = 'Essingen' | 'Langweid';

interface DepotMapGLProps {
  depot: DepotId;
  tracks: TrackGeometry[];
  allocations: Allocation[];
  movePlans: MovePlan[];
  conflicts: Array<{
    id: string;
    trackId: string;
    type: string;
    description: string;
    severity: string;
  }>;
  mapView: 'streets' | 'satellite';
  onTrackClick?: (track: TrackGeometry) => void;
  onAllocationClick?: (a: Allocation) => void;
  onDrop?: (
    trainId: string,
    trackId: string,
    meta?: { lengthM?: number; feature?: string }
  ) => void;
}

// Depot center coordinates
const DEPOT_CENTERS = {
  Essingen: { lat: 48.7995, lon: 10.0000 },
  Langweid: { lat: 48.4890, lon: 10.8490 },
};

export default function DepotMapGL({
  depot,
  tracks,
  allocations,
  movePlans,
  conflicts,
  mapView,
  onTrackClick,
  onAllocationClick,
}: DepotMapGLProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());

  console.log('DepotMapGL rendering:', { depot, tracksCount: tracks.length, allocationsCount: allocations.length });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) {
      console.error('Map container not found');
      return;
    }

    console.log('Initializing map for depot:', depot);
    const center = DEPOT_CENTERS[depot];
    console.log('Center coordinates:', center);
    
    // Initialize map with OpenStreetMap tiles
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: mapView === 'satellite'
              ? ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']
              : ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: mapView === 'satellite' 
              ? '&copy; Esri &copy; Maxar'
              : '&copy; OpenStreetMap contributors'
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
      center: [center.lon, center.lat],
      zoom: 16,
      pitch: 0,
      bearing: 0,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    
    // Add scale control
    map.current.addControl(new maplibregl.ScaleControl({
      maxWidth: 200,
      unit: 'metric'
    }), 'bottom-left');

    map.current.on('load', () => {
      console.log('Map loaded successfully');
      setMapLoaded(true);
    });

    map.current.on('error', (e) => {
      console.error('Map error:', e);
      setMapError(e.error?.message || 'Kartenfehler');
    });

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();
      map.current?.remove();
    };
  }, [depot, mapView]);

  // Update map center when depot changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      const center = DEPOT_CENTERS[depot];
      map.current.flyTo({
        center: [center.lon, center.lat],
        zoom: 16,
        duration: 1000
      });
    }
  }, [depot, mapLoaded]);

  // Add track geometries as lines
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing layers and sources
    if (map.current.getLayer('tracks')) {
      map.current.removeLayer('tracks');
    }
    if (map.current.getLayer('track-labels')) {
      map.current.removeLayer('track-labels');
    }
    if (map.current.getSource('tracks')) {
      map.current.removeSource('tracks');
    }

    // Create GeoJSON features for tracks
    const trackFeatures = tracks.map(track => {
      // Get track status based on allocations
      const trackAllocations = allocations.filter(a => a.trackId === track.id);
      const hasConflict = conflicts.some(c => c.trackId === track.id);
      const isOccupied = trackAllocations.length > 0;
      
      let trackColor = '#10b981'; // Green - free
      if (track.state === 'gesperrt' || track.state === 'defekt') {
        trackColor = '#6b7280'; // Gray - out of service
      } else if (hasConflict) {
        trackColor = '#ef4444'; // Red - conflict
      } else if (isOccupied || track.state === 'belegt') {
        trackColor = '#eab308'; // Yellow - occupied
      }

      return {
        type: 'Feature' as const,
        properties: {
          id: track.id,
          name: track.name,
          depot: track.depot,
          length: track.lengthM,
          state: track.state,
          features: track.features.join(', '),
          color: trackColor,
          occupied: isOccupied,
          hasConflict: hasConflict
        },
        geometry: track.geometry
      };
    });

    // Add tracks source
    map.current.addSource('tracks', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: trackFeatures
      }
    });

    // Add track lines layer
    map.current.addLayer({
      id: 'tracks',
      type: 'line',
      source: 'tracks',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 6,
        'line-opacity': 0.8
      }
    });

    // Add track labels
    map.current.addLayer({
      id: 'track-labels',
      type: 'symbol',
      source: 'tracks',
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-anchor': 'center',
        'text-offset': [0, -1],
        'symbol-placement': 'line-center',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2
      }
    });

    // Add click handler for tracks
    map.current.on('click', 'tracks', (e) => {
      if (e.features && e.features[0]) {
        const trackId = e.features[0].properties?.id;
        const track = tracks.find(t => t.id === trackId);
        if (track && onTrackClick) {
          onTrackClick(track);
        }
      }
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'tracks', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'tracks', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

  }, [tracks, allocations, conflicts, mapLoaded, onTrackClick]);

  // Add train markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current.clear();

    // Add markers for each allocation
    allocations.forEach(allocation => {
      const track = tracks.find(t => t.id === allocation.trackId);
      if (!track) return;

      // Calculate position along track based on offsetM
      const totalLength = track.lengthM;
      const offsetM = allocation.offsetM ?? 0;
      const offsetRatio = offsetM / totalLength;
      const geometryIndex = Math.floor(offsetRatio * (track.geometry.coordinates.length - 1));
      const position = track.geometry.coordinates[geometryIndex] || track.geometry.coordinates[0];

      // Create marker element
      const el = document.createElement('div');
      el.className = 'train-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '12px';
      el.style.fontWeight = 'bold';
      el.style.color = 'white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      
      // Set color based on purpose
      let bgColor = '#10b981'; // Default - green
      if (allocation.purpose === 'ARA') {
        bgColor = '#eab308'; // ARA - yellow
      } else if (allocation.purpose === 'Korr') {
        bgColor = '#f97316'; // Corrective - orange
      } else if (allocation.purpose === 'Unfall') {
        bgColor = '#ef4444'; // Accident - red
      }
      el.style.backgroundColor = bgColor;
      
      // Add train icon or text
      el.innerHTML = '🚂';
      
      // Add tooltip
      el.title = `${allocation.train_id} - ${allocation.line_code}\n${allocation.purpose} - ${allocation.status}`;

      // Create marker
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(position as [number, number]);
      
      if (map.current) {
        marker.addTo(map.current);
      }

      // Add popup
      const popup = new maplibregl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 8px;">
            <strong>${allocation.train_id}</strong><br/>
            Line: ${allocation.line_code}<br/>
            Type: ${allocation.purpose}<br/>
            Status: ${allocation.status}<br/>
            Track: ${allocation.trackId}<br/>
            ${allocation.startPlanned.toLocaleTimeString()} - ${allocation.endPlanned.toLocaleTimeString()}
          </div>
        `);
      
      marker.setPopup(popup);

      // Add click handler
      el.addEventListener('click', () => {
        if (onAllocationClick) {
          onAllocationClick(allocation);
        }
      });

      markers.current.set(allocation.id, marker);
    });

  }, [allocations, tracks, mapLoaded, onAllocationClick]);

  // Add movement paths
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing movement layers
    if (map.current.getLayer('movement-paths')) {
      map.current.removeLayer('movement-paths');
    }
    if (map.current.getSource('movement-paths')) {
      map.current.removeSource('movement-paths');
    }

    // Create movement path features
    const pathFeatures = movePlans.map(plan => {
      // Generate a simple path (this would be more sophisticated in production)
      const fromTrack = tracks.find(t => t.id === plan.from.trackId);
      const toTrack = tracks.find(t => t.id === plan.to.trackId);
      
      let coordinates: [number, number][] = [];
      if (fromTrack && toTrack) {
        coordinates = [
          fromTrack.geometry.coordinates[0],
          toTrack.geometry.coordinates[0]
        ];
      } else if (plan.path) {
        coordinates = plan.path;
      }

      return {
        type: 'Feature' as const,
        properties: {
          id: plan.id,
          type: plan.type,
          trainId: plan.train_id,
          color: plan.type === 'ZUFUEHRUNG' ? '#10b981' : '#ef4444'
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: coordinates
        }
      };
    }).filter(f => f.geometry.coordinates.length > 0);

    if (pathFeatures.length > 0) {
      // Add movement paths source
      map.current.addSource('movement-paths', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: pathFeatures
        }
      });

      // Add movement paths layer
      map.current.addLayer({
        id: 'movement-paths',
        type: 'line',
        source: 'movement-paths',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': 0.6,
          'line-dasharray': [2, 2]
        }
      });
    }

  }, [movePlans, tracks, mapLoaded]);

  return (
    <div className="relative w-full h-full bg-gray-900">
      <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '400px' }} />
      
      {/* Loading indicator */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <div className="text-white text-lg">Lade Karte...</div>
        </div>
      )}
      
      {/* Error message */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center p-4">
            <div className="text-red-400 text-lg mb-2">Kartenfehler</div>
            <div className="text-gray-400">{mapError}</div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Neu laden
            </button>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg">
        <div className="text-xs font-semibold mb-2">Gleisfarben:</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-green-500"></div>
            <span className="text-xs">Frei</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-yellow-500"></div>
            <span className="text-xs">Belegt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-red-500"></div>
            <span className="text-xs">Konflikt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-gray-500"></div>
            <span className="text-xs">Außer Betrieb</span>
          </div>
        </div>
      </div>
    </div>
  );
}
