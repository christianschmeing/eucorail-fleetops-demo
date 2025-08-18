'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useQueryClient } from '@tanstack/react-query';
import { useSSETrains } from './hooks/useSSETrains';

interface TrainMarkerProps {
  map: maplibregl.Map | null;
  selectedTrain: string | null;
  onTrainSelect: (trainId: string) => void;
  lineFilter?: string[];
}

// Types for timetable-based positioning
type Stop = {
  id: string;
  name: string;
  lon: number;
  lat: number;
  arr: number; // minutes since cycle start
  dep: number; // minutes since cycle start
};

type Segment = {
  fromStopId: string;
  toStopId: string;
  geometry: [number, number][]; // LineString coordinates [lon, lat]
};

type TrainDefinition = {
  id: string;
  line: string;
  region: 'BY' | 'BW';
  status: 'active' | 'maintenance' | 'stationary' | 'inspection';
  cycleMinutes?: number; // length of repeating timetable cycle
  stops?: Stop[];
  segments?: Segment[];
};

type ComputedTrain = {
  id: string;
  line: string;
  region: 'BY' | 'BW';
  status: string;
  lon: number;
  lat: number;
  speed: number;
  description: string;
};

// Simple depots for slotting maintenance/stationary trains
const DEPOTS = {
  langweid: { id: 'langweid', name: 'Langweid', lon: 10.8569, lat: 48.4908 },
  essingen: { id: 'essingen', name: 'Essingen', lon: 9.3072, lat: 48.8089 },
};

// Base train definitions + simplified timetables (repeating cycles)
const TRAIN_DEFINITIONS: TrainDefinition[] = [
  // RE9-78001: maintenance at Langweid
  { id: 'RE9-78001', line: 'RE9', region: 'BY', status: 'maintenance' },

  // RE9-78002: München → Augsburg → Nürnberg (cycle ~120m)
  {
    id: 'RE9-78002',
    line: 'RE9',
    region: 'BY',
    status: 'active',
    cycleMinutes: 120,
    stops: [
      { id: 'muc', name: 'München Hbf', lon: 11.561, lat: 48.1402, arr: 0, dep: 5 },
      { id: 'aux', name: 'Augsburg Hbf', lon: 10.8978, lat: 48.365, arr: 55, dep: 60 },
      { id: 'nue', name: 'Nürnberg Hbf', lon: 11.0829, lat: 49.446, arr: 115, dep: 120 },
    ],
    segments: [
      {
        fromStopId: 'muc',
        toStopId: 'aux',
        geometry: [
          [11.561, 48.1402],
          [10.8978, 48.365],
        ],
      },
      {
        fromStopId: 'aux',
        toStopId: 'nue',
        geometry: [
          [10.8978, 48.365],
          [11.0829, 49.446],
        ],
      },
    ],
  },

  // RE8-79021: Stuttgart → Ulm → München (cycle ~130m)
  {
    id: 'RE8-79021',
    line: 'RE8',
    region: 'BW',
    status: 'active',
    cycleMinutes: 130,
    stops: [
      { id: 'str', name: 'Stuttgart Hbf', lon: 9.1829, lat: 48.7834, arr: 0, dep: 5 },
      { id: 'ulm', name: 'Ulm Hbf', lon: 10.0006, lat: 48.3984, arr: 55, dep: 60 },
      { id: 'muc', name: 'München Hbf', lon: 11.561, lat: 48.1402, arr: 125, dep: 130 },
    ],
    segments: [
      {
        fromStopId: 'str',
        toStopId: 'ulm',
        geometry: [
          [9.1829, 48.7834],
          [10.0006, 48.3984],
        ],
      },
      {
        fromStopId: 'ulm',
        toStopId: 'muc',
        geometry: [
          [10.0006, 48.3984],
          [11.561, 48.1402],
        ],
      },
    ],
  },

  // RE8-79022: Ulm → München (short cycle ~70m)
  {
    id: 'RE8-79022',
    line: 'RE8',
    region: 'BW',
    status: 'active',
    cycleMinutes: 70,
    stops: [
      { id: 'ulm', name: 'Ulm Hbf', lon: 10.0006, lat: 48.3984, arr: 0, dep: 5 },
      { id: 'muc', name: 'München Hbf', lon: 11.561, lat: 48.1402, arr: 65, dep: 70 },
    ],
    segments: [
      {
        fromStopId: 'ulm',
        toStopId: 'muc',
        geometry: [
          [10.0006, 48.3984],
          [11.561, 48.1402],
        ],
      },
    ],
  },

  // MEX16-66011: München → Augsburg → Ulm (cycle ~110m)
  {
    id: 'MEX16-66011',
    line: 'MEX16',
    region: 'BY',
    status: 'active',
    cycleMinutes: 110,
    stops: [
      { id: 'muc', name: 'München Hbf', lon: 11.561, lat: 48.1402, arr: 0, dep: 5 },
      { id: 'aux', name: 'Augsburg Hbf', lon: 10.8978, lat: 48.365, arr: 45, dep: 50 },
      { id: 'ulm', name: 'Ulm Hbf', lon: 10.0006, lat: 48.3984, arr: 105, dep: 110 },
    ],
    segments: [
      {
        fromStopId: 'muc',
        toStopId: 'aux',
        geometry: [
          [11.561, 48.1402],
          [10.8978, 48.365],
        ],
      },
      {
        fromStopId: 'aux',
        toStopId: 'ulm',
        geometry: [
          [10.8978, 48.365],
          [10.0006, 48.3984],
        ],
      },
    ],
  },

  // MEX16-66012: inspection at Augsburg Hbf
  { id: 'MEX16-66012', line: 'MEX16', region: 'BY', status: 'inspection' },

  // BY-12345: stationary in BY depot area
  { id: 'BY-12345', line: 'BY', region: 'BY', status: 'stationary' },
  // BW-67890: stationary in BW depot area
  { id: 'BW-67890', line: 'BW', region: 'BW', status: 'stationary' },
];

// Helpers
const toMinutesSinceMidnight = (d: Date): number => d.getHours() * 60 + d.getMinutes();

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const haversine = (a: [number, number], b: [number, number]): number => {
  const R = 6371000; // meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const pointAlongLine = (line: [number, number][], fraction: number): [number, number] => {
  if (line.length === 0) return [0, 0];
  if (line.length === 1) return line[0];
  const segLengths = [] as number[];
  let total = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const d = haversine(line[i], line[i + 1]);
    segLengths.push(d);
    total += d;
  }
  const target = fraction * total;
  let acc = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (acc + segLengths[i] >= target) {
      const remain = target - acc;
      const t = segLengths[i] === 0 ? 0 : remain / segLengths[i];
      const [lon1, lat1] = line[i];
      const [lon2, lat2] = line[i + 1];
      return [lon1 + (lon2 - lon1) * t, lat1 + (lat2 - lat1) * t];
    }
    acc += segLengths[i];
  }
  return line[line.length - 1];
};

const metersToDegrees = (meters: number, lat: number): { dLon: number; dLat: number } => {
  const dLat = meters / 111111; // approx
  const dLon = meters / (111111 * Math.cos((lat * Math.PI) / 180));
  return { dLon, dLat };
};

const hashToSlot = (id: string, slotSize = 20, grid = 4): { dx: number; dy: number } => {
  // deterministic small offset in meters based on id
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const x = h % grid;
  const y = Math.floor(h / grid) % grid;
  const dx = (x - (grid - 1) / 2) * slotSize;
  const dy = (y - (grid - 1) / 2) * slotSize;
  return { dx, dy };
};

const isValidCoord = (lon: number, lat: number): boolean => {
  if (!isFinite(lon) || !isFinite(lat)) return false;
  if (lon === 0 && lat === 0) return false;
  // Rough BY/BW bounds
  return lon >= 7 && lon <= 13 && lat >= 47 && lat <= 51;
};

const getDepotForRegion = (region: 'BY' | 'BW') =>
  region === 'BY' ? DEPOTS.langweid : DEPOTS.essingen;

const computeSchedulePosition = (
  train: TrainDefinition,
  tMinutes: number
): { lon: number; lat: number; speed: number; atStop: boolean; description: string } => {
  if (!train.stops || !train.segments || !train.cycleMinutes) {
    // Fallback: place at depot
    const depot = getDepotForRegion(train.region);
    return { lon: depot.lon, lat: depot.lat, speed: 0, atStop: true, description: 'Depot' };
  }
  const cycle = train.cycleMinutes;
  const t = tMinutes % cycle;
  const stopsById = new Map(train.stops.map((s) => [s.id, s] as const));

  // Dwell handling
  for (const s of train.stops) {
    if (t >= s.arr && t <= s.dep) {
      return {
        lon: s.lon,
        lat: s.lat,
        speed: 0,
        atStop: true,
        description: `${train.stops[0].name} → ${train.stops[train.stops.length - 1].name}`,
      };
    }
  }
  // Find active segment
  for (const seg of train.segments) {
    const from = stopsById.get(seg.fromStopId)!;
    const to = stopsById.get(seg.toStopId)!;
    if (t > from.dep && t < to.arr) {
      const progress = clamp((t - from.dep) / (to.arr - from.dep), 0, 1);
      const [lon, lat] = pointAlongLine(seg.geometry, progress);
      const segLenM = haversine(seg.geometry[0], seg.geometry[seg.geometry.length - 1]);
      const minutes = to.arr - from.dep;
      const speedMs = minutes > 0 ? segLenM / (minutes * 60) : 0;
      const speedKmH = speedMs * 3.6;
      return {
        lon,
        lat,
        speed: Math.round(speedKmH),
        atStop: false,
        description: `${train.stops[0].name} → ${train.stops[train.stops.length - 1].name}`,
      };
    }
  }
  // Before first dep or after last arr in cycle: park at nearest logical stop
  const first = train.stops[0];
  const last = train.stops[train.stops.length - 1];
  if (t <= first.dep)
    return {
      lon: first.lon,
      lat: first.lat,
      speed: 0,
      atStop: true,
      description: `${first.name} → ${last.name}`,
    };
  return {
    lon: last.lon,
    lat: last.lat,
    speed: 0,
    atStop: true,
    description: `${first.name} → ${last.name}`,
  };
};

const computeAllTrainPositions = (): ComputedTrain[] => {
  const now = new Date();
  const t = toMinutesSinceMidnight(now);
  const result: ComputedTrain[] = [];
  for (const def of TRAIN_DEFINITIONS) {
    if (def.status === 'maintenance' || def.status === 'stationary') {
      const depot = getDepotForRegion(def.region);
      const slot = hashToSlot(def.id);
      const { dLon, dLat } = metersToDegrees(30, depot.lat); // 30m grid spacing
      const lon = depot.lon + dLon * (slot.dx / 30);
      const lat = depot.lat + dLat * (slot.dy / 30);
      result.push({
        id: def.id,
        line: def.line,
        region: def.region,
        status: def.status,
        lon,
        lat,
        speed: 0,
        description: `${depot.name} (Depot)`,
      });
      continue;
    }
    if (def.status === 'inspection') {
      // Park at Augsburg Hbf for demo
      const lon = 10.8978;
      const lat = 48.365;
      result.push({
        id: def.id,
        line: def.line,
        region: def.region,
        status: def.status,
        lon,
        lat,
        speed: 0,
        description: 'Augsburg Hbf (Inspektion)',
      });
      continue;
    }
    const { lon, lat, speed, description } = computeSchedulePosition(def, t);
    result.push({
      id: def.id,
      line: def.line,
      region: def.region,
      status: def.status,
      lon,
      lat,
      speed,
      description,
    });
  }
  return result;
};

export default function TrainMarkers({
  map,
  selectedTrain,
  onTrainSelect,
  lineFilter,
}: TrainMarkerProps) {
  const qc = useQueryClient();
  useSSETrains();
  const lastUpdateByTrainRef = useRef<Map<string, number>>(new Map());
  const hasInitializedRef = useRef(false);
  const eventListenersAddedRef = useRef(false);
  const didFitRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastJsonRef = useRef<string>('');
  const lastNonEmptyJsonRef = useRef<string>('');
  const lastFeatureByIdRef = useRef<Map<string, any>>(new Map());
  const lastUpdateByIdRef = useRef<Map<string, number>>(new Map());
  const lastCenteredIdRef = useRef<string | null>(null);
  type DomMarkerAnim = {
    marker: maplibregl.Marker;
    el: HTMLDivElement;
    lastLonLat: [number, number] | null;
    animFrom: [number, number] | null;
    animTo: [number, number] | null;
    animStartMs: number;
    animDurationMs: number;
  };
  const domMarkersRef = useRef<Map<string, DomMarkerAnim>>(new Map());
  const trailsByIdRef = useRef<Map<string, [number, number][]>>(new Map());
  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === '1';
  const holdoverMinutes = Number(process.env.NEXT_PUBLIC_HOLDOVER_MINUTES ?? 5);
  const holdoverMs = Math.max(0, holdoverMinutes) * 60 * 1000;
  const hasLiveRef = useRef<boolean>(false);
  const fallbackTimerRef = useRef<number | null>(null);

  // Helpers for DOM markers
  const computeBearing = (a: [number, number], b: [number, number]): number => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const lon1 = toRad(a[0]);
    const lat1 = toRad(a[1]);
    const lon2 = toRad(b[0]);
    const lat2 = toRad(b[1]);
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x);
    return (toDeg(brng) + 360) % 360;
  };

  const renderTrainIconSVG = (type: 'siemens' | 'stadler', directionDeg: number) => {
    const fill = type === 'siemens' ? '#003d7a' : '#ff6600';
    return `
      <svg width="32" height="16" viewBox="0 0 32 16" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${directionDeg}deg); transform-origin: 50% 50%;">
        <rect x="2" y="3" width="28" height="10" rx="4" fill="${fill}" />
        <circle cx="10" cy="13" r="2" fill="#ffffff" opacity="0.9" />
        <circle cx="22" cy="13" r="2" fill="#ffffff" opacity="0.9" />
        <path d="M30 8 L25 5 L25 11 Z" fill="#ffffff" opacity="0.85" />
      </svg>
    `;
  };

  const ensureDomMarker = (
    id: string,
    lon: number,
    lat: number,
    line: string,
    isStale: boolean,
    acceptNewTarget = true,
    titleText?: string
  ) => {
    if (!map) return;
    let entry = domMarkersRef.current.get(id);
    const manufacturer: 'siemens' | 'stadler' = line === 'MEX16' ? 'siemens' : 'stadler';
    if (!entry) {
      const el = document.createElement('div');
      el.setAttribute('data-testid', 'train-marker');
      el.setAttribute('data-train-id', id);
      el.style.width = '32px';
      el.style.height = '16px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.style.willChange = 'transform';
      el.style.filter = isStale ? 'grayscale(1) opacity(0.6)' : 'none';
      // Unified tooltip: FZ • Slot • UIC + Line + ECM + Next due (best-effort)
      if (titleText) {
        el.title = titleText;
      } else {
        const meta: any = (lastFeatureByIdRef.current.get(id) as any)?.properties || {};
        const slot = meta.slot ? ` • ${meta.slot}` : '';
        const uic = meta.uic ? ` • ${meta.uic}` : '';
        const ecm = meta.health ? ` • ECM:${meta.health}` : '';
        const next = meta.nextDue ? ` • Next:${meta.nextDue}` : '';
        const sched = meta.estimated ? ' • SCHED' : '';
        el.title = `${id}${slot}${uic} • ${line || ''}${ecm}${next}${sched}`;
      }
      el.innerHTML = renderTrainIconSVG(manufacturer, 0);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onTrainSelect(id);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lon, lat])
        .addTo(map);
      entry = {
        marker,
        el,
        lastLonLat: [lon, lat],
        animFrom: null,
        animTo: null,
        animStartMs: 0,
        animDurationMs: 0,
      };
      domMarkersRef.current.set(id, entry);
    } else {
      entry.el.style.filter = isStale ? 'grayscale(1) opacity(0.6)' : 'none';
      const prev = entry.lastLonLat;
      const moved = !prev || Math.abs(prev[0] - lon) > 1e-6 || Math.abs(prev[1] - lat) > 1e-6;
      if (moved && acceptNewTarget) {
        // Start an animated transition toward the new target
        const now = performance.now();
        const from = entry.lastLonLat ?? [lon, lat];
        const to: [number, number] = [lon, lat];
        const distanceMeters = haversine([from[0], from[1]], [to[0], to[1]]);
        // Duration scales with distance (min 1000ms, max 5000ms)
        const duration = Math.max(1000, Math.min(5000, Math.round(distanceMeters * 15))); // ~15 ms per meter
        entry.animFrom = from;
        entry.animTo = to;
        entry.animStartMs = now;
        entry.animDurationMs = duration;
      }
    }
  };

  // Easing for acceleration/braking effect
  const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // Animation loop to smoothly move markers between targets
  const stepAnimation = () => {
    if (!map) return;
    const zoom = map.getZoom();
    const scale = Math.max(0.7, Math.min(1.6, 0.7 + 0.12 * (zoom - 8)));
    const now = performance.now();
    for (const [id, entry] of domMarkersRef.current.entries()) {
      if (!entry.animFrom || !entry.animTo || entry.animDurationMs <= 0) continue;
      const elapsed = now - entry.animStartMs;
      const t = Math.max(0, Math.min(1, elapsed / entry.animDurationMs));
      const eased = easeInOutCubic(t);
      const [lon1, lat1] = entry.animFrom;
      const [lon2, lat2] = entry.animTo;
      const lon = lon1 + (lon2 - lon1) * eased;
      const lat = lat1 + (lat2 - lat1) * eased;
      // Update direction based on instantaneous gradient
      const dir = computeBearing([lon1, lat1], [lon, lat]);
      // Update SVG rotation by replacing innerHTML only when crossing noticeable angle deltas
      if (entry.lastLonLat) {
        const lastDir = computeBearing(entry.lastLonLat, [lon, lat]);
        if (Math.abs(lastDir - dir) > 5) {
          // keep manufacturer color based on id prefix
          const manufacturer: 'siemens' | 'stadler' = id.startsWith('MEX16')
            ? 'siemens'
            : 'stadler';
          entry.el.innerHTML = renderTrainIconSVG(manufacturer, dir);
        }
      }
      entry.marker.setLngLat([lon, lat]);
      entry.el.style.transform = `scale(${scale})`;
      entry.lastLonLat = [lon, lat];
      if (t >= 1) {
        // Arrived at target
        entry.animFrom = [lon2, lat2];
        entry.animTo = [lon2, lat2];
        entry.animDurationMs = 0;
      }
    }
    rafRef.current = requestAnimationFrame(stepAnimation);
  };

  useEffect(() => {
    if (!map || hasInitializedRef.current) return;

    const initLayers = () => {
      if (!map || hasInitializedRef.current) return;
      console.log('🚂 Initializing clustered train markers...');
      // Add clustered trains source
      if (typeof map.getSource === 'function' && !map.getSource('trains')) {
        map.addSource('trains', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterRadius: 40,
          clusterMaxZoom: 14,
        } as any);
      }
      // Cluster bubbles
      if (typeof map.getLayer === 'function' && !map.getLayer('clusters')) {
        map.addLayer({
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
      // Cluster counts
      if (typeof map.getLayer === 'function' && !map.getLayer('cluster-count')) {
        map.addLayer({
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
      // Train trails source and layer
      if (!isTestMode && typeof map.getSource === 'function' && !map.getSource('train-trails')) {
        map.addSource('train-trails', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        } as any);
      }
      if (!isTestMode && typeof map.getLayer === 'function' && !map.getLayer('train-trails')) {
        map.addLayer({
          id: 'train-trails',
          type: 'line',
          source: 'train-trails',
          paint: {
            'line-color': '#4ADE80',
            'line-width': 3,
            'line-opacity': 0.5,
          },
        });
      }
      // Unclustered trains
      if (typeof map.getLayer === 'function' && !map.getLayer('trains-unclustered')) {
        map.addLayer({
          id: 'trains-unclustered',
          type: 'circle',
          source: 'trains',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 14,
            'circle-stroke-width': 2,
            'circle-stroke-color': ['case', ['==', ['get', 'stale'], true], '#BDBDBD', '#FFFFFF'],
            'circle-color': [
              'case',
              ['==', ['get', 'health'], 'ok'],
              '#10B981',
              ['==', ['get', 'health'], 'warn'],
              '#F59E0B',
              ['==', ['get', 'health'], 'due'],
              '#EF4444',
              '#6B7280',
            ],
          },
        });
      }
      // Selected overlay (top)
      if (typeof map.getLayer === 'function' && !map.getLayer('train-selected')) {
        map.addLayer({
          id: 'train-selected',
          type: 'circle',
          source: 'trains',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], '___none___']],
          paint: {
            'circle-radius': 18,
            'circle-stroke-width': 3,
            'circle-stroke-color': '#FFFFFF',
            'circle-opacity': 0.9,
            'circle-color': [
              'case',
              ['==', ['get', 'health'], 'ok'],
              '#10B981',
              ['==', ['get', 'health'], 'warn'],
              '#F59E0B',
              ['==', ['get', 'health'], 'due'],
              '#EF4444',
              '#6B7280',
            ],
          },
        });
      }
      // Ensure layer order
      try {
        if (typeof map.getLayer === 'function' && map.getLayer('clusters'))
          map.moveLayer('clusters');
        if (typeof map.getLayer === 'function' && map.getLayer('cluster-count'))
          map.moveLayer('cluster-count');
        if (typeof map.getLayer === 'function' && map.getLayer('trains-unclustered'))
          map.moveLayer('trains-unclustered');
        if (typeof map.getLayer === 'function' && map.getLayer('train-selected'))
          map.moveLayer('train-selected');
        if (typeof map.getLayer === 'function' && map.getLayer('depots-symbol'))
          map.moveLayer('depots-symbol');
      } catch {}
      // Click + hover handlers
      if (!eventListenersAddedRef.current) {
        map.on('click', 'trains-unclustered', (e) => {
          if (e.features && e.features[0]) {
            const trainId = e.features[0].properties?.id;
            if (trainId) {
              onTrainSelect(trainId);
              console.log('🚂 Train selected:', trainId);
            }
          }
        });
        map.on('mouseenter', 'trains-unclustered', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'trains-unclustered', () => {
          map.getCanvas().style.cursor = '';
        });
        map.on('click', 'clusters', async (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          const clusterId = features[0]?.properties?.cluster_id;
          const source = map.getSource('trains') as any;
          if (source && clusterId != null) {
            source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
              if (err) return;
              const [lng, lat] = (features[0].geometry as any).coordinates as [number, number];
              if (isTestMode) map.jumpTo({ center: [lng, lat], zoom });
              else map.easeTo({ center: [lng, lat], zoom });
            });
          }
        });
        map.on('dragstart', () => {
          didFitRef.current = true;
        });
        map.on('zoomstart', () => {
          didFitRef.current = true;
        });
        eventListenersAddedRef.current = true;
      }
      console.log('✅ Clustered train marker layers initialized');
      try {
        (window as any).__mapReady = true;
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('map:ready'));
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('trains:update'));
      } catch {}
      hasInitializedRef.current = true;
      if (!isTestMode && !rafRef.current && hasLiveRef.current) {
        rafRef.current = requestAnimationFrame(stepAnimation);
      }
    };

    let loadHandler: any = null;
    if ((map as any).isStyleLoaded && map.isStyleLoaded()) {
      initLayers();
    } else {
      loadHandler = () => {
        try {
          map.off('load', loadHandler);
        } catch {}
        initLayers();
      };
      map.on('load', loadHandler);
    }

    return () => {
      if (loadHandler) {
        try {
          map.off('load', loadHandler);
        } catch {}
      }
      // Cleanup
      for (const layerId of ['train-selected', 'trains-unclustered', 'cluster-count', 'clusters']) {
        if (typeof map.getLayer === 'function' && map.getLayer(layerId)) map.removeLayer(layerId);
      }
      if (typeof map.getLayer === 'function' && map.getLayer('train-trails'))
        map.removeLayer('train-trails');
      if (typeof map.getSource === 'function' && map.getSource('trains'))
        map.removeSource('trains');
      if (typeof map.getSource === 'function' && map.getSource('train-trails'))
        map.removeSource('train-trails');
      for (const [, entry] of domMarkersRef.current.entries()) {
        entry.marker.remove();
      }
      domMarkersRef.current.clear();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [map, onTrainSelect, isTestMode]);

  // Track SSE connectivity to decide whether to animate/trail
  useEffect(() => {
    const onConnected = () => {
      hasLiveRef.current = true;
      if (!isTestMode && map && !rafRef.current)
        rafRef.current = requestAnimationFrame(stepAnimation);
    };
    const onError = () => {
      /* keep last state */
    };
    window.addEventListener('sse:connected', onConnected as any);
    window.addEventListener('sse:error', onError as any);
    return () => {
      window.removeEventListener('sse:connected', onConnected as any);
      window.removeEventListener('sse:error', onError as any);
    };
  }, [map, isTestMode]);

  // Periodic fallback recompute every 45s when no live data yet
  useEffect(() => {
    if (isTestMode) return;
    const setup = () => {
      if (hasLiveRef.current) return;
      if (fallbackTimerRef.current) return;
      const tick = () => {
        if (hasLiveRef.current) return;
        const bootstrap = computeAllTrainPositions();
        const bootstrapFc = {
          type: 'FeatureCollection',
          features: bootstrap.map((t) => ({
            type: 'Feature',
            properties: {
              id: t.id,
              line: t.line,
              status: t.status,
              speed: t.speed,
              ts: Date.now(),
              desc: t.description,
              estimated: true,
            },
            geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
          })),
        } as any;
        qc.setQueryData(['trains', 'live'], bootstrapFc);
        try {
          window.dispatchEvent(new CustomEvent('trains:update'));
        } catch {}
      };
      tick();
      fallbackTimerRef.current = window.setInterval(tick, 45000);
    };
    setup();
    return () => {
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [qc, isTestMode]);

  // Update map source from React Query cache; throttle with rAF and compare snapshots
  useEffect(() => {
    if (!map) return;
    const update = () => {
      const now = Date.now();
      let fc = qc.getQueryData<any>(['trains', 'live']);
      const seenIds = new Set<string>();
      const nextFeatures: any[] = [];
      let invalidCount = 0;

      // Fallback bootstrap if SSE has not populated anything yet
      let liveFeatures = Array.isArray(fc?.features) ? fc.features : [];
      if (!liveFeatures || liveFeatures.length === 0) {
        const bootstrap = computeAllTrainPositions();
        const bootstrapFc = {
          type: 'FeatureCollection',
          features: bootstrap.map((t) => ({
            type: 'Feature',
            properties: {
              id: t.id,
              line: t.line,
              status: t.status,
              speed: t.speed,
              ts: Date.now(),
              desc: t.description,
              estimated: true,
            },
            geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
          })),
        } as any;
        qc.setQueryData(['trains', 'live'], bootstrapFc);
        try {
          window.dispatchEvent(new CustomEvent('trains:update'));
        } catch {}
        fc = bootstrapFc;
        liveFeatures = bootstrapFc.features;
      }
      for (const f of liveFeatures) {
        const coords = (f?.geometry?.coordinates || []) as [number, number];
        const id = f?.properties?.id as string | undefined;
        const line = f?.properties?.line;
        const status = f?.properties?.status;
        const title =
          f?.properties?.estimated && f?.properties?.desc
            ? `Fahrplan-Position (geschätzt) – ${id}: ${f.properties.desc}`
            : id;
        if (!id) continue;
        if (!Array.isArray(coords) || coords.length !== 2) {
          invalidCount++;
          continue;
        }
        const [lon, lat] = coords;
        if (!isValidCoord(lon, lat)) {
          invalidCount++;
          continue;
        }
        if (
          Array.isArray(lineFilter) &&
          lineFilter.length > 0 &&
          line &&
          !lineFilter.includes(String(line))
        ) {
          continue;
        }
        // Throttle per-train updates: at most once every 5 seconds
        const nowMs = Date.now();
        const last = lastUpdateByTrainRef.current.get(id) ?? 0;
        if (nowMs - last < 5000 && lastFeatureByIdRef.current.has(id)) {
          // Use previous feature to avoid rapid jitter
          const prev = lastFeatureByIdRef.current.get(id)!;
          const keep = {
            ...(prev as any),
            properties: { ...(prev as any).properties, stale: false },
          };
          nextFeatures.push(keep);
          const [plon, plat] = keep.geometry.coordinates as [number, number];
          ensureDomMarker(id, plon, plat, keep.properties.line, false, !isTestMode, title);
          seenIds.add(id);
          continue;
        }
        const health = status === 'active' ? 'ok' : status === 'maintenance' ? 'warn' : 'due';
        const feature = {
          type: 'Feature',
          properties: { id, line, health, stale: false },
          geometry: { type: 'Point', coordinates: [lon, lat] },
        };
        nextFeatures.push(feature);
        seenIds.add(id);
        lastFeatureByIdRef.current.set(id, feature);
        lastUpdateByIdRef.current.set(id, nowMs);
        lastUpdateByTrainRef.current.set(id, nowMs);
        ensureDomMarker(id, lon, lat, line, false, !isTestMode, title);
        // Update trail with latest live position
        const arr = trailsByIdRef.current.get(id) ?? [];
        const prev = arr[arr.length - 1];
        if (!prev || Math.abs(prev[0] - lon) > 1e-6 || Math.abs(prev[1] - lat) > 1e-6) {
          arr.push([lon, lat]);
          if (arr.length > 20) arr.shift();
          trailsByIdRef.current.set(id, arr);
        }
      }

      // Holdover: keep last known feature for a while when missing
      for (const [id, feature] of lastFeatureByIdRef.current.entries()) {
        if (seenIds.has(id)) continue;
        const lastUpdate = lastUpdateByIdRef.current.get(id) ?? 0;
        if (now - lastUpdate <= holdoverMs) {
          const keep = {
            ...(feature as any),
            properties: { ...(feature as any).properties, stale: true },
          };
          nextFeatures.push(keep);
          const [plon, plat] = keep.geometry.coordinates as [number, number];
          ensureDomMarker(id, plon, plat, keep.properties.line, true, !isTestMode);
        }
      }

      // Stabilize order
      nextFeatures.sort((a, b) => String(a.properties.id).localeCompare(String(b.properties.id)));

      // Avoid empty setData if we had a non-empty snapshot previously
      const out = { type: 'FeatureCollection', features: nextFeatures } as any;
      let json = JSON.stringify(out);
      if (nextFeatures.length === 0 && lastNonEmptyJsonRef.current) {
        json = lastNonEmptyJsonRef.current;
      }
      if (nextFeatures.length > 0) lastNonEmptyJsonRef.current = json;

      if (map && map.getSource('trains')) {
        if (json !== (window as any).__lastTrainsJSON) {
          (window as any).__lastTrainsJSON = json;
          const source = map.getSource('trains') as maplibregl.GeoJSONSource;
          if (isTestMode) source.setData(JSON.parse(json));
          else requestAnimationFrame(() => source.setData(JSON.parse(json)));
        }
      }

      // Update trails source from accumulated positions
      if (!isTestMode && map && map.getSource('train-trails')) {
        const trailFeatures: any[] = [];
        for (const [id, coords] of trailsByIdRef.current.entries()) {
          if (!coords || coords.length < 2) continue;
          trailFeatures.push({
            type: 'Feature',
            properties: { id },
            geometry: { type: 'LineString', coordinates: coords },
          });
        }
        const trailsOut = { type: 'FeatureCollection', features: trailFeatures } as any;
        const source = map.getSource('train-trails') as maplibregl.GeoJSONSource;
        source.setData(trailsOut);
      }

      // Remove DOM markers that are no longer present and beyond holdover
      const keepIds = new Set(nextFeatures.map((f: any) => String(f.properties.id)));
      for (const [id, entry] of domMarkersRef.current.entries()) {
        if (!keepIds.has(id)) {
          const lastUpdate = lastUpdateByIdRef.current.get(id) ?? 0;
          if (now - lastUpdate > holdoverMs) {
            entry.marker.remove();
            domMarkersRef.current.delete(id);
          }
        }
      }

      if (!didFitRef.current && nextFeatures.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        for (const ft of nextFeatures) bounds.extend(ft.geometry.coordinates as [number, number]);
        map.fitBounds(bounds, { padding: 48, duration: isTestMode ? 0 : 300 });
        didFitRef.current = true;
      }

      // Data quality event for UI banner
      try {
        window.dispatchEvent(
          new CustomEvent('trains:quality', {
            detail: { valid: nextFeatures.length, invalid: invalidCount },
          })
        );
      } catch {}
    };
    update();
    const handler = () => update();
    window.addEventListener('trains:update', handler as any);
    const onBootstrap = () => update();
    window.addEventListener('trains:bootstrap:request', onBootstrap as any);
    return () => window.removeEventListener('trains:update', handler as any);
  }, [map, qc, selectedTrain, isTestMode]);

  // Center map to selected train on selection change (read from cache)
  useEffect(() => {
    if (!map || !selectedTrain) return;
    const fc = qc.getQueryData<any>(['trains', 'live']);
    const features = Array.isArray(fc?.features) ? fc.features : [];
    const found = features.find((f: any) => f?.properties?.id === selectedTrain);
    if (!found) return;
    const [lon, lat] = (found.geometry?.coordinates || []) as [number, number];
    if (!isValidCoord(lon, lat)) return;

    // Only re-center if target changed or we're far enough/zoomed out
    const mapCenter = map.getCenter();
    const distanceMeters = haversine([mapCenter.lng, mapCenter.lat], [lon, lat]);
    const targetZoom = Math.max(map.getZoom(), 12);
    const shouldRecentreById = lastCenteredIdRef.current !== selectedTrain;
    const shouldRecentreByDistance = distanceMeters > 200 || map.getZoom() < 12;
    if (!shouldRecentreById && !shouldRecentreByDistance) return;

    if (isTestMode) {
      map.jumpTo({ center: [lon, lat], zoom: targetZoom });
    } else {
      map.flyTo({ center: [lon, lat], zoom: targetZoom, duration: 400 });
    }
    lastCenteredIdRef.current = selectedTrain;
  }, [map, selectedTrain, qc, isTestMode]);

  // Reflect selection in overlay filter
  useEffect(() => {
    if (!map) return;
    const targetId = selectedTrain ?? '___none___';
    if (typeof map.getLayer === 'function' && map.getLayer('train-selected')) {
      map.setFilter('train-selected', [
        'all',
        ['!', ['has', 'point_count']],
        ['==', ['get', 'id'], targetId],
      ] as any);
    }
  }, [map, selectedTrain]);

  return null; // This component doesn't render anything visible
}
