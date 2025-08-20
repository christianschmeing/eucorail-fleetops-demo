'use client';

import React, { useEffect, useState } from 'react';
import type { Allocation } from '../depot-data';
import type { TrackGeometry } from '../track-geometries';

interface SimpleDepotMapProps {
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

export default function SimpleDepotMap({
  depot,
  tracks,
  allocations,
  onTrackClick,
  onAllocationClick,
}: SimpleDepotMapProps) {
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const center = DEPOT_CENTERS[depot];

  // SVG dimensions and scaling
  const svgWidth = 800;
  const svgHeight = 600;
  const scale = 10000; // Scale factor for lat/lon to SVG coordinates

  // Convert lat/lon to SVG coordinates
  const latLonToSVG = (lon: number, lat: number) => {
    const x = (lon - center.lon) * scale + svgWidth / 2;
    const y = -(lat - center.lat) * scale + svgHeight / 2;
    return { x, y };
  };

  // Get track color based on state and allocations
  const getTrackColor = (track: TrackGeometry) => {
    const hasAllocation = allocations.some(a => a.trackId === track.id);
    if (track.state === 'gesperrt' || track.state === 'defekt') {
      return '#6b7280'; // Gray - out of service
    } else if (hasAllocation || track.state === 'belegt') {
      return '#eab308'; // Yellow - occupied
    }
    return '#10b981'; // Green - free
  };

  useEffect(() => {
    // Simulate map loading
    setTimeout(() => setMapLoaded(true), 500);
  }, []);

  return (
    <div className="relative w-full h-full bg-gray-800 overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800">
        {/* Grid pattern for map effect */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Main SVG Map */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Depot Label */}
        <text
          x={svgWidth / 2}
          y={30}
          textAnchor="middle"
          className="fill-white text-2xl font-bold"
        >
          Depot {depot}
        </text>

        {/* Render Tracks */}
        {tracks.map(track => {
          const points = track.geometry.coordinates.map(([lon, lat]) => {
            const { x, y } = latLonToSVG(lon, lat);
            return `${x},${y}`;
          }).join(' ');

          return (
            <g key={track.id}>
              {/* Track Line */}
              <polyline
                points={points}
                stroke={getTrackColor(track)}
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                className="cursor-pointer hover:stroke-opacity-80 transition-all"
                onClick={() => onTrackClick?.(track)}
              />
              
              {/* Track Label */}
              {track.geometry.coordinates[0] && (
                <text
                  x={latLonToSVG(track.geometry.coordinates[0][0], track.geometry.coordinates[0][1]).x}
                  y={latLonToSVG(track.geometry.coordinates[0][0], track.geometry.coordinates[0][1]).y - 10}
                  textAnchor="middle"
                  className="fill-white text-xs font-semibold pointer-events-none"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {track.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Render Trains/Allocations */}
        {allocations.map(allocation => {
          const track = tracks.find(t => t.id === allocation.trackId);
          if (!track) return null;

          // Calculate position along track
          const offsetRatio = (allocation.offsetM ?? 0) / track.lengthM;
          const pointIndex = Math.floor(offsetRatio * (track.geometry.coordinates.length - 1));
          const [lon, lat] = track.geometry.coordinates[pointIndex] || track.geometry.coordinates[0];
          const { x, y } = latLonToSVG(lon, lat);

          // Determine color based on purpose
          let bgColor = '#10b981'; // Default green
          if (allocation.purpose === 'ARA') bgColor = '#eab308';
          else if (allocation.purpose === 'Korr') bgColor = '#f97316';
          else if (allocation.purpose === 'Unfall') bgColor = '#ef4444';

          return (
            <g key={allocation.id}>
              {/* Train Circle */}
              <circle
                cx={x}
                cy={y}
                r="12"
                fill={bgColor}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:r-14 transition-all"
                onClick={() => onAllocationClick?.(allocation)}
              />
              
              {/* Train Icon */}
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                className="text-base pointer-events-none"
              >
                🚂
              </text>

              {/* Train Label */}
              <text
                x={x}
                y={y + 25}
                textAnchor="middle"
                className="fill-white text-xs font-semibold pointer-events-none"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                {allocation.train_id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <div className="text-white text-lg">Lade Depot-Karte...</div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-lg shadow-lg">
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
            <div className="w-4 h-1 bg-gray-500"></div>
            <span className="text-xs">Außer Betrieb</span>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-lg shadow-lg">
        <div className="text-sm font-semibold">{depot}</div>
        <div className="text-xs text-gray-600">
          {tracks.length} Gleise | {allocations.length} Züge
        </div>
      </div>
    </div>
  );
}
