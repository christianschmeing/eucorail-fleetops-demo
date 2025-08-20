import React from 'react';
import type { Allocation } from '../depot-data';
import type { TrackGeometry } from '../track-geometries';

interface ServerDepotMapProps {
  depot: 'Essingen' | 'Langweid';
  tracks: TrackGeometry[];
  allocations: Allocation[];
}

const DEPOT_CENTERS = {
  // align center with track data bases from track-geometries.ts
  Essingen: { lat: 48.823, lon: 10.015 },
  Langweid: { lat: 48.449, lon: 10.846 },
};

// This component renders completely on the server
export default function ServerDepotMap({ depot, tracks, allocations }: ServerDepotMapProps) {
  const center = DEPOT_CENTERS[depot];

  // Create static map URL
  const osmMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${center.lon - 0.01},${center.lat - 0.005},${center.lon + 0.01},${center.lat + 0.005}&layer=mapnik`;

  return (
    <div className="w-full h-full bg-gray-800 relative">
      {/* Static OpenStreetMap iframe - base context */}
      <iframe
        width="100%"
        height="100%"
        frameBorder={0}
        scrolling="no"
        src={osmMapUrl}
        className="absolute inset-0"
        title={`Depot ${depot} Map`}
      />

      {/* Info overlay */}
      <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Depot {depot}</h2>
        <div className="space-y-1">
          <p className="text-sm">📍 Gleise: {tracks.length}</p>
          <p className="text-sm">🚂 Züge: {allocations.length}</p>
          <p className="text-sm">✅ Frei: {tracks.filter((t) => t.state === 'frei').length}</p>
          <p className="text-sm">🟡 Belegt: {tracks.filter((t) => t.state === 'belegt').length}</p>
        </div>
      </div>

      {/* Track lines + allocation markers (schematic overlay) */}
      <svg
        className="pointer-events-none absolute inset-0"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        style={{ zIndex: 5 }}
      >
        {tracks.map((t) => {
          // rough project geometry to screen space using bbox heuristic
          const minX = center.lon - 0.01;
          const minY = center.lat - 0.005;
          const width = 0.02;
          const height = 0.01;
          const toX = (lng: number) => ((lng - minX) / width) * 1000;
          const toY = (lat: number) => (1 - (lat - minY) / height) * 1000;
          const d = t.geometry.coordinates
            .map(([lng, lat], i) => `${i === 0 ? 'M' : 'L'} ${toX(lng)} ${toY(lat)}`)
            .join(' ');
          const color =
            t.state === 'frei'
              ? '#10b981'
              : t.state === 'belegt'
                ? '#eab308'
                : t.state === 'gesperrt'
                  ? '#ef4444'
                  : '#6b7280';
          return (
            <g key={t.id}>
              <path d={d} stroke="#000" strokeOpacity={0.25} strokeWidth={5} fill="none" />
              <path d={d} stroke={color} strokeWidth={4} fill="none" opacity={0.95} />
              {/* endpoints for visibility */}
              {t.geometry.coordinates.slice(0, 1).map(([lng, lat], idx) => (
                <circle
                  key={`s-${t.id}-${idx}`}
                  cx={((lng - (center.lon - 0.01)) / 0.02) * 1000}
                  cy={(1 - (lat - (center.lat - 0.005)) / 0.01) * 1000}
                  r={4}
                  fill="#60a5fa"
                />
              ))}
              {t.geometry.coordinates.slice(-1).map(([lng, lat], idx) => (
                <circle
                  key={`e-${t.id}-${idx}`}
                  cx={((lng - (center.lon - 0.01)) / 0.02) * 1000}
                  cy={(1 - (lat - (center.lat - 0.005)) / 0.01) * 1000}
                  r={4}
                  fill="#f87171"
                />
              ))}
            </g>
          );
        })}

        {/* allocation markers */}
        {allocations.map((a) => {
          const t = tracks.find((x) => x.id === a.trackId);
          if (!t || t.geometry.coordinates.length < 2) return null;
          const [lngA, latA] = t.geometry.coordinates[0];
          const [lngB, latB] = t.geometry.coordinates[t.geometry.coordinates.length - 1];
          const r = Math.max(0, Math.min(1, (a.offsetM ?? t.lengthM / 2) / (t.lengthM || 1)));
          const lng = lngA * (1 - r) + lngB * r;
          const lat = latA * (1 - r) + latB * r;
          const minX = center.lon - 0.01;
          const minY = center.lat - 0.005;
          const width = 0.02;
          const height = 0.01;
          const x = ((lng - minX) / width) * 1000;
          const y = (1 - (lat - minY) / height) * 1000;
          const fill =
            a.status === 'maintenance' ? '#f59e0b' : a.status === 'reserve' ? '#6b7280' : '#10b981';
          return (
            <g key={a.id}>
              <circle cx={x} cy={y} r={6} fill="#000" opacity={0.3} />
              <circle cx={x} cy={y} r={4} fill={fill} />
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg max-h-64 overflow-y-auto">
        <h3 className="font-bold mb-2">Gleisbelegung:</h3>
        <div className="space-y-1 text-xs">
          {tracks.map((track) => {
            const trackAllocation = allocations.find((a) => a.trackId === track.id);
            return (
              <div key={track.id} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    track.state === 'frei'
                      ? 'bg-green-500'
                      : track.state === 'belegt'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                  }`}
                />
                <span>{track.name}:</span>
                <span className="text-gray-300">
                  {trackAllocation ? trackAllocation.train_id : 'Frei'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
