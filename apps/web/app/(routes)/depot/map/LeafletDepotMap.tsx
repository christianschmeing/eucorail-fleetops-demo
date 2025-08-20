'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Allocation } from '../depot-data';
import type { TrackGeometry } from '../track-geometries';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LeafletDepotMapProps {
  depot: 'Essingen' | 'Langweid';
  tracks: TrackGeometry[];
  allocations: Allocation[];
  onTrackClick?: (track: TrackGeometry) => void;
  onAllocationClick?: (a: Allocation) => void;
}

// Depot center coordinates
const DEPOT_CENTERS = {
  Essingen: { lat: 48.7995, lon: 10.0000 },
  Langweid: { lat: 48.4890, lon: 10.8490 },
};

export default function LeafletDepotMap({
  depot,
  tracks,
  allocations,
  onTrackClick,
  onAllocationClick,
}: LeafletDepotMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const center = DEPOT_CENTERS[depot];

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lon],
      zoom: 16,
      attributionControl: true,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [depot]);

  // Update tracks on map
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing polylines
    polylinesRef.current.forEach(p => p.remove());
    polylinesRef.current = [];

    // Add track polylines
    tracks.forEach(track => {
      if (track.geometry?.coordinates) {
        // Convert coordinates to LatLng
        const latLngs = track.geometry.coordinates.map(coord => 
          L.latLng(coord[1], coord[0]) // Note: GeoJSON is [lon, lat], Leaflet expects [lat, lon]
        );

        // Determine track color
        const hasAllocation = allocations.some(a => a.trackId === track.id);
        let color = '#10b981'; // Green - free
        if (track.state === 'gesperrt' || track.state === 'defekt') {
          color = '#6b7280'; // Gray - out of service
        } else if (hasAllocation || track.state === 'belegt') {
          color = '#eab308'; // Yellow - occupied
        }

        // Create polyline
        const polyline = L.polyline(latLngs, {
          color: color,
          weight: 6,
          opacity: 0.8,
        });
        
        if (mapRef.current) {
          polyline.addTo(mapRef.current);
        }

        // Add popup with track info
        polyline.bindPopup(`
          <div style="padding: 8px;">
            <strong>${track.name}</strong><br/>
            Länge: ${track.lengthM}m<br/>
            Status: ${track.state}<br/>
            Features: ${track.features.join(', ') || 'Keine'}
          </div>
        `);

        // Add click handler
        polyline.on('click', () => {
          if (onTrackClick) {
            onTrackClick(track);
          }
        });

        polylinesRef.current.push(polyline);
      }
    });
  }, [tracks, allocations, onTrackClick]);

  // Update train markers on map
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add train markers
    allocations.forEach(allocation => {
      const track = tracks.find(t => t.id === allocation.trackId);
      if (!track || !track.geometry?.coordinates) return;

      // Calculate position along track
      const offsetRatio = (allocation.offsetM ?? 0) / track.lengthM;
      const pointIndex = Math.floor(offsetRatio * (track.geometry.coordinates.length - 1));
      const coord = track.geometry.coordinates[pointIndex] || track.geometry.coordinates[0];
      
      // Create custom icon based on purpose
      let bgColor = '#10b981'; // Default green
      if (allocation.purpose === 'ARA') bgColor = '#eab308';
      else if (allocation.purpose === 'Korr') bgColor = '#f97316';
      else if (allocation.purpose === 'Unfall') bgColor = '#ef4444';

      // Create HTML icon
      const icon = L.divIcon({
        html: `
          <div style="
            width: 30px;
            height: 30px;
            background-color: ${bgColor};
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">
            🚂
          </div>
        `,
        className: 'train-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      // Create marker
      const marker = L.marker([coord[1], coord[0]], { icon });
      
      if (mapRef.current) {
        marker.addTo(mapRef.current);
      }

      // Add popup
      marker.bindPopup(`
        <div style="padding: 8px;">
          <strong>${allocation.train_id}</strong><br/>
          Linie: ${allocation.line_code}<br/>
          Typ: ${allocation.purpose}<br/>
          Status: ${allocation.status}<br/>
          Gleis: ${allocation.trackId}<br/>
          ${allocation.startPlanned.toLocaleTimeString()} - ${allocation.endPlanned.toLocaleTimeString()}
        </div>
      `);

      // Add click handler
      marker.on('click', () => {
        if (onAllocationClick) {
          onAllocationClick(allocation);
        }
      });

      markersRef.current.push(marker);
    });
  }, [allocations, tracks, onAllocationClick]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
        style={{ minHeight: '500px', zIndex: 1 }}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-lg shadow-lg z-[400]">
        <div className="text-xs font-semibold mb-2 text-gray-800">Gleisfarben:</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-green-500"></div>
            <span className="text-xs text-gray-700">Frei</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-yellow-500"></div>
            <span className="text-xs text-gray-700">Belegt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-gray-500"></div>
            <span className="text-xs text-gray-700">Außer Betrieb</span>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-lg shadow-lg z-[400]">
        <div className="text-sm font-semibold text-gray-800">Depot {depot}</div>
        <div className="text-xs text-gray-600">
          {tracks.length} Gleise | {allocations.length} Züge
        </div>
      </div>
    </div>
  );
}
