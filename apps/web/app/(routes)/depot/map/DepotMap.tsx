import React from 'react';
import type { Allocation, MovePlan } from '../depot-data';
import type { TrackGeometry } from '../track-geometries';

type DepotId = 'Essingen' | 'Langweid';

interface DepotMapProps {
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

type XY = { x: number; y: number };

function computeBounds(coords: [number, number][]): {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
} {
  let minLon = Infinity,
    minLat = Infinity,
    maxLon = -Infinity,
    maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLon, minLat, maxLon, maxLat };
}

function project(
  lon: number,
  lat: number,
  bounds: { minLon: number; minLat: number; maxLon: number; maxLat: number },
  width: number,
  height: number
): XY {
  const { minLon, minLat, maxLon, maxLat } = bounds;
  const nx = (lon - minLon) / Math.max(1e-6, maxLon - minLon);
  const ny = 1 - (lat - minLat) / Math.max(1e-6, maxLat - minLat);
  return { x: nx * width, y: ny * height };
}

// Linear interpolation along a 2-point LineString
function pointAlong(track: TrackGeometry, offsetM: number): [number, number] {
  const [a, b] = track.geometry.coordinates;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const lenM = Math.max(1, track.lengthM);
  const t = Math.min(1, Math.max(0, offsetM / lenM));
  return [ax + dx * t, ay + dy * t];
}

function trackColor(state: TrackGeometry['state']): string {
  switch (state) {
    case 'frei':
      return '#10b981';
    case 'belegt':
      return '#eab308';
    case 'gesperrt':
      return '#ef4444';
    case 'defekt':
      return '#6b7280';
    default:
      return '#9ca3af';
  }
}

export default function DepotMap({
  depot,
  tracks,
  allocations,
  movePlans,
  conflicts,
  mapView,
  onTrackClick,
  onAllocationClick,
  onDrop,
}: DepotMapProps) {
  const width = 1600;
  const height = 900;

  const depotTracks = tracks.filter((t) => t.depot === depot);
  const coords = depotTracks.flatMap((t) => t.geometry.coordinates);
  const bounds = computeBounds(coords);

  const bg =
    mapView === 'satellite'
      ? 'linear-gradient(180deg, #0f172a 0%, #111827 60%, #0f172a 100%)'
      : 'linear-gradient(180deg, #0b1020 0%, #0e172a 60%, #0b1020 100%)';

  return (
    <div className="w-full h-full relative" data-testid="map-canvas">
      <div
        className="absolute inset-0"
        style={{ background: bg, backgroundSize: 'cover' }}
        aria-label="Map background"
      />
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0"
        role="img"
        aria-label={`Depotkarte ${depot}`}
      >
        {/* Depot perimeter (approx: bounding box) */}
        <rect
          x={0 + 20}
          y={0 + 20}
          width={width - 40}
          height={height - 40}
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={2}
          rx={12}
        />

        {/* Tracks */}
        {depotTracks.map((t) => {
          const p0 = project(
            t.geometry.coordinates[0][0],
            t.geometry.coordinates[0][1],
            bounds,
            width,
            height
          );
          const p1 = project(
            t.geometry.coordinates[1][0],
            t.geometry.coordinates[1][1],
            bounds,
            width,
            height
          );
          const stroke = trackColor(t.state);
          const isBlocked = t.state === 'gesperrt' || t.state === 'defekt';
          return (
            <g
              key={t.id}
              data-testid="track-line"
              onClick={() => onTrackClick?.(t)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                try {
                  const json = e.dataTransfer?.getData('application/json');
                  if (json) {
                    const data = JSON.parse(json) as {
                      trainId: string;
                      lengthM?: number;
                      feature?: string;
                    };
                    onDrop?.(data.trainId, t.id, { lengthM: data.lengthM, feature: data.feature });
                  }
                } catch {}
              }}
            >
              <line
                x1={p0.x}
                y1={p0.y}
                x2={p1.x}
                y2={p1.y}
                stroke={stroke}
                strokeWidth={8}
                opacity={isBlocked ? 0.6 : 0.9}
              />
              {/* Track label */}
              <text
                x={(p0.x + p1.x) / 2}
                y={(p0.y + p1.y) / 2 - 10}
                fill="#e5e7eb"
                fontSize={12}
                textAnchor="middle"
              >
                {t.id}
              </text>
              {/* Conflict badge on track */}
              {conflicts.some((c) => c.trackId === t.id) && (
                <g>
                  <title>Konflikt</title>
                  <text
                    x={(p0.x + p1.x) / 2 + 14}
                    y={(p0.y + p1.y) / 2 - 10}
                    fontSize={14}
                    fill="#f87171"
                  >
                    ⚡
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Allocation markers */}
        {allocations
          .filter((a) => depotTracks.some((t) => t.id === a.trackId))
          .map((a) => {
            const track = depotTracks.find((t) => t.id === a.trackId)!;
            const off = Math.min(track.lengthM - 10, Math.max(0, a.offsetM ?? 0));
            const [lon, lat] = pointAlong(track, off);
            const p = project(lon, lat, bounds, width, height);
            const isColor = (purpose: Allocation['purpose']) => {
              switch (purpose) {
                case 'IS1':
                  return '#3b82f6';
                case 'IS2':
                  return '#22c55e';
                case 'IS3':
                  return '#eab308';
                case 'IS4':
                  return '#8b5cf6';
                case 'ARA':
                  return '#14b8a6';
                case 'Korr':
                case 'Unfall':
                  return '#ef4444';
                default:
                  return '#93c5fd';
              }
            };
            const riskStroke =
              a.risk === 'high' ? '#ef4444' : a.risk === 'med' ? '#f59e0b' : '#22c55e';
            return (
              <g
                key={a.id}
                className="cursor-pointer"
                onClick={() => onAllocationClick?.(a)}
                data-testid="allocation-marker"
              >
                <rect
                  x={p.x - 22}
                  y={p.y - 10}
                  width={44}
                  height={20}
                  rx={8}
                  fill={isColor(a.purpose)}
                  stroke={riskStroke}
                  strokeWidth={2}
                  opacity={0.95}
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  fill="#0b1020"
                  fontSize={10}
                  textAnchor="middle"
                  fontWeight={700}
                >
                  {a.train_id}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );
}
