'use client';

import React, { useEffect, useRef } from 'react';
import type { Allocation } from '../depot-data';
import type { TrackGeometry } from '../track-geometries';

interface StaticDepotMapProps {
  depot: 'Essingen' | 'Langweid';
  tracks: TrackGeometry[];
  allocations: Allocation[];
  onTrackClick?: (track: TrackGeometry) => void;
  onAllocationClick?: (a: Allocation) => void;
}

// Use a static map image service
const DEPOT_CENTERS = {
  Essingen: { lat: 48.7995, lon: 10.0000, zoom: 16 },
  Langweid: { lat: 48.4890, lon: 10.8490, zoom: 16 },
};

export default function StaticDepotMap({
  depot,
  tracks,
  allocations,
  onTrackClick,
  onAllocationClick,
}: StaticDepotMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  const center = DEPOT_CENTERS[depot];
  
  // Static map URL using OpenStreetMap static image
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${center.lon - 0.005},${center.lat - 0.003},${center.lon + 0.005},${center.lat + 0.003}&layer=mapnik`;

  // Calculate relative positions for overlays
  const latToY = (lat: number) => {
    const range = 0.006; // Total lat range
    const offset = (center.lat + 0.003 - lat) / range;
    return offset * 100; // Convert to percentage
  };

  const lonToX = (lon: number) => {
    const range = 0.010; // Total lon range
    const offset = (lon - (center.lon - 0.005)) / range;
    return offset * 100; // Convert to percentage
  };

  // Get track color
  const getTrackColor = (track: TrackGeometry) => {
    const hasAllocation = allocations.some(a => a.trackId === track.id);
    if (track.state === 'gesperrt' || track.state === 'defekt') {
      return 'bg-gray-500';
    } else if (hasAllocation || track.state === 'belegt') {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  return (
    <div className="relative w-full h-full bg-gray-200" ref={mapRef}>
      {/* OpenStreetMap Embedded iframe */}
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        src={mapUrl}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        title={`Depot ${depot} Map`}
      />
      
      {/* Overlay container for tracks and trains */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        {/* Render track overlays */}
        {tracks.map(track => {
          if (!track.geometry?.coordinates || track.geometry.coordinates.length < 2) return null;
          
          const start = track.geometry.coordinates[0];
          const end = track.geometry.coordinates[track.geometry.coordinates.length - 1];
          
          const x1 = lonToX(start[0]);
          const y1 = latToY(start[1]);
          const x2 = lonToX(end[0]);
          const y2 = latToY(end[1]);
          
          // Calculate line angle
          const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
          const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          
          return (
            <div
              key={track.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${x1}%`,
                top: `${y1}%`,
                width: `${length}%`,
                transform: `rotate(${angle}deg)`,
                transformOrigin: '0 50%',
              }}
              onClick={() => onTrackClick?.(track)}
            >
              <div 
                className={`h-2 ${getTrackColor(track)} opacity-70 hover:opacity-100 cursor-pointer`}
                title={`${track.name} - ${track.state}`}
              />
              <div className="absolute -top-5 left-0 text-xs font-bold text-white bg-black/50 px-1 rounded"
                   style={{ transform: `rotate(${-angle}deg)` }}>
                {track.name}
              </div>
            </div>
          );
        })}
        
        {/* Render train markers */}
        {allocations.map(allocation => {
          const track = tracks.find(t => t.id === allocation.trackId);
          if (!track || !track.geometry?.coordinates) return null;
          
          // Calculate position along track
          const offsetRatio = (allocation.offsetM ?? 0) / track.lengthM;
          const pointIndex = Math.floor(offsetRatio * (track.geometry.coordinates.length - 1));
          const coord = track.geometry.coordinates[pointIndex] || track.geometry.coordinates[0];
          
          const x = lonToX(coord[0]);
          const y = latToY(coord[1]);
          
          // Determine color based on purpose
          let bgColor = 'bg-green-600';
          if (allocation.purpose === 'ARA') bgColor = 'bg-yellow-600';
          else if (allocation.purpose === 'Korr') bgColor = 'bg-orange-600';
          else if (allocation.purpose === 'Unfall') bgColor = 'bg-red-600';
          
          return (
            <div
              key={allocation.id}
              className={`absolute w-8 h-8 ${bgColor} rounded-full border-2 border-white shadow-lg cursor-pointer pointer-events-auto hover:scale-110 transition-transform flex items-center justify-center text-white font-bold`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
              }}
              onClick={() => onAllocationClick?.(allocation)}
              title={`${allocation.train_id} - ${allocation.line_code}`}
            >
              <span className="text-xs">🚂</span>
            </div>
          );
        })}
      </div>
      
      {/* Info Panel */}
      <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-lg shadow-lg" style={{ zIndex: 30 }}>
        <div className="text-sm font-semibold text-gray-800">Depot {depot}</div>
        <div className="text-xs text-gray-600">
          {tracks.length} Gleise | {allocations.length} Züge
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-lg shadow-lg" style={{ zIndex: 30 }}>
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
    </div>
  );
}
