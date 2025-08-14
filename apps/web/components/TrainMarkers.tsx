"use client";

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useQueryClient } from '@tanstack/react-query';
import { useSSETrains } from './hooks/useSSETrains';

interface TrainMarkerProps {
  map: maplibregl.Map | null;
  selectedTrain: string | null;
  onTrainSelect: (trainId: string) => void;
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
  essingen: { id: 'essingen', name: 'Essingen', lon: 9.3072, lat: 48.8089 }
};

// Base train definitions + simplified timetables (repeating cycles)
const TRAIN_DEFINITIONS: TrainDefinition[] = [
  // RE9-78001: maintenance at Langweid
  { id: 'RE9-78001', line: 'RE9', region: 'BY', status: 'maintenance' },

  // RE9-78002: München → Augsburg → Nürnberg (cycle ~120m)
  {
    id: 'RE9-78002', line: 'RE9', region: 'BY', status: 'active', cycleMinutes: 120,
    stops: [
      { id: 'muc', name: 'München Hbf', lon: 11.5610, lat: 48.1402, arr: 0, dep: 5 },
      { id: 'aux', name: 'Augsburg Hbf', lon: 10.8978, lat: 48.3650, arr: 55, dep: 60 },
      { id: 'nue', name: 'Nürnberg Hbf', lon: 11.0829, lat: 49.4460, arr: 115, dep: 120 }
    ],
    segments: [
      { fromStopId: 'muc', toStopId: 'aux', geometry: [[11.5610,48.1402],[10.8978,48.3650]] },
      { fromStopId: 'aux', toStopId: 'nue', geometry: [[10.8978,48.3650],[11.0829,49.4460]] }
    ]
  },

  // RE8-79021: Stuttgart → Ulm → München (cycle ~130m)
  {
    id: 'RE8-79021', line: 'RE8', region: 'BW', status: 'active', cycleMinutes: 130,
    stops: [
      { id: 'str', name: 'Stuttgart Hbf', lon: 9.1829, lat: 48.7834, arr: 0, dep: 5 },
      { id: 'ulm', name: 'Ulm Hbf', lon: 10.0006, lat: 48.3984, arr: 55, dep: 60 },
      { id: 'muc', name: 'München Hbf', lon: 11.5610, lat: 48.1402, arr: 125, dep: 130 }
    ],
    segments: [
      { fromStopId: 'str', toStopId: 'ulm', geometry: [[9.1829,48.7834],[10.0006,48.3984]] },
      { fromStopId: 'ulm', toStopId: 'muc', geometry: [[10.0006,48.3984],[11.5610,48.1402]] }
    ]
  },

  // RE8-79022: Ulm → München (short cycle ~70m)
  {
    id: 'RE8-79022', line: 'RE8', region: 'BW', status: 'active', cycleMinutes: 70,
    stops: [
      { id: 'ulm', name: 'Ulm Hbf', lon: 10.0006, lat: 48.3984, arr: 0, dep: 5 },
      { id: 'muc', name: 'München Hbf', lon: 11.5610, lat: 48.1402, arr: 65, dep: 70 }
    ],
    segments: [
      { fromStopId: 'ulm', toStopId: 'muc', geometry: [[10.0006,48.3984],[11.5610,48.1402]] }
    ]
  },

  // MEX16-66011: München → Augsburg → Ulm (cycle ~110m)
  {
    id: 'MEX16-66011', line: 'MEX16', region: 'BY', status: 'active', cycleMinutes: 110,
    stops: [
      { id: 'muc', name: 'München Hbf', lon: 11.5610, lat: 48.1402, arr: 0, dep: 5 },
      { id: 'aux', name: 'Augsburg Hbf', lon: 10.8978, lat: 48.3650, arr: 45, dep: 50 },
      { id: 'ulm', name: 'Ulm Hbf', lon: 10.0006, lat: 48.3984, arr: 105, dep: 110 }
    ],
    segments: [
      { fromStopId: 'muc', toStopId: 'aux', geometry: [[11.5610,48.1402],[10.8978,48.3650]] },
      { fromStopId: 'aux', toStopId: 'ulm', geometry: [[10.8978,48.3650],[10.0006,48.3984]] }
    ]
  },

  // MEX16-66012: inspection at Augsburg Hbf
  { id: 'MEX16-66012', line: 'MEX16', region: 'BY', status: 'inspection' },

  // BY-12345: stationary in BY depot area
  { id: 'BY-12345', line: 'BY', region: 'BY', status: 'stationary' },
  // BW-67890: stationary in BW depot area
  { id: 'BW-67890', line: 'BW', region: 'BW', status: 'stationary' }
];

// Helpers
const toMinutesSinceMidnight = (d: Date): number => d.getHours() * 60 + d.getMinutes();

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const haversine = (a: [number,number], b: [number,number]): number => {
  const R = 6371000; // meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat/2);
  const sinDLon = Math.sin(dLon/2);
  const h = sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLon*sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const pointAlongLine = (line: [number,number][], fraction: number): [number,number] => {
  if (line.length === 0) return [0,0];
  if (line.length === 1) return line[0];
  const segLengths = [] as number[];
  let total = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const d = haversine(line[i], line[i+1]);
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
      const [lon2, lat2] = line[i+1];
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

const getDepotForRegion = (region: 'BY' | 'BW') => (region === 'BY' ? DEPOTS.langweid : DEPOTS.essingen);

const computeSchedulePosition = (train: TrainDefinition, tMinutes: number): { lon: number; lat: number; speed: number; atStop: boolean; description: string } => {
  if (!train.stops || !train.segments || !train.cycleMinutes) {
    // Fallback: place at depot
    const depot = getDepotForRegion(train.region);
    return { lon: depot.lon, lat: depot.lat, speed: 0, atStop: true, description: 'Depot' };
  }
  const cycle = train.cycleMinutes;
  const t = tMinutes % cycle;
  const stopsById = new Map(train.stops.map(s => [s.id, s] as const));

  // Dwell handling
  for (const s of train.stops) {
    if (t >= s.arr && t <= s.dep) {
      return { lon: s.lon, lat: s.lat, speed: 0, atStop: true, description: `${train.stops[0].name} → ${train.stops[train.stops.length - 1].name}` };
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
      const speedMs = minutes > 0 ? (segLenM / (minutes * 60)) : 0;
      const speedKmH = speedMs * 3.6;
      return { lon, lat, speed: Math.round(speedKmH), atStop: false, description: `${train.stops[0].name} → ${train.stops[train.stops.length - 1].name}` };
    }
  }
  // Before first dep or after last arr in cycle: park at nearest logical stop
  const first = train.stops[0];
  const last = train.stops[train.stops.length - 1];
  if (t <= first.dep) return { lon: first.lon, lat: first.lat, speed: 0, atStop: true, description: `${first.name} → ${last.name}` };
  return { lon: last.lon, lat: last.lat, speed: 0, atStop: true, description: `${first.name} → ${last.name}` };
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
      result.push({ id: def.id, line: def.line, region: def.region, status: def.status, lon, lat, speed: 0, description: `${depot.name} (Depot)` });
      continue;
    }
    if (def.status === 'inspection') {
      // Park at Augsburg Hbf for demo
      const lon = 10.8978; const lat = 48.3650;
      result.push({ id: def.id, line: def.line, region: def.region, status: def.status, lon, lat, speed: 0, description: 'Augsburg Hbf (Inspektion)' });
      continue;
    }
    const { lon, lat, speed, description } = computeSchedulePosition(def, t);
    result.push({ id: def.id, line: def.line, region: def.region, status: def.status, lon, lat, speed, description });
  }
  return result;
};

export default function TrainMarkers({ map, selectedTrain, onTrainSelect }: TrainMarkerProps) {
  const qc = useQueryClient();
  useSSETrains();
  const hasInitializedRef = useRef(false);
  const eventListenersAddedRef = useRef(false);
  const didFitRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastJsonRef = useRef<string>('');

  useEffect(() => {
    if (!map || hasInitializedRef.current) return;

    console.log('🚂 Initializing timetable-based train markers...');

    // Add train markers source (single source, no clustering)
    if (!map.getSource('trains')) {
      map.addSource('trains', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: false
      });
    }

    // Add train markers layer (unclustered)
    if (!map.getLayer('train_markers')) {
      map.addLayer({
        id: 'train_markers',
        type: 'circle',
        source: 'trains',
        filter: ['all', ['==', ['geometry-type'], 'Point']],
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'selected'], true], 18,
            14
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'line'], 'RE9'], '#3B82F6',
            ['==', ['get', 'line'], 'RE8'], '#10B981',
            ['==', ['get', 'line'], 'MEX16'], '#F59E0B',
            '#6B7280'
          ],
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'selected'], true], 3,
            2
          ],
          'circle-stroke-opacity': 0.9
        }
      });
    }

    // Add event listeners only once
    if (!eventListenersAddedRef.current) {
      // Click handler for unclustered train markers
      map.on('click', 'train_markers', (e) => {
        if (e.features && e.features[0]) {
          const trainId = e.features[0].properties?.id;
          if (trainId) {
            onTrainSelect(trainId);
            console.log('🚂 Train selected:', trainId);
          }
        }
      });


      // Change cursor on hover
      map.on('mouseenter', 'train_markers', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'train_markers', () => {
        map.getCanvas().style.cursor = '';
      });


      eventListenersAddedRef.current = true;
    }

    console.log('✅ Timetable-based train markers initialized');
    hasInitializedRef.current = true;

    return () => {
      // Cleanup
      if (map.getLayer('train_markers')) map.removeLayer('train_markers');
      if (map.getSource('trains')) map.removeSource('trains');
    };
  }, [map, onTrainSelect]); // Removed selectedTrain and trainData from dependencies

  // Update map source from React Query cache; throttle with rAF and compare snapshots
  useEffect(() => {
    if (!map) return;
    const update = () => {
      const fc = qc.getQueryData<any>(['trains', 'live']);
      if (!fc || !map.getSource('trains')) return;
      const features = (fc.features || [])
        .map((f: any) => {
          const [lon, lat] = f.geometry.coordinates as [number, number];
          if (!isValidCoord(lon, lat)) return null;
          return { type: 'Feature', properties: { ...f.properties, selected: selectedTrain === f.properties?.id }, geometry: { type: 'Point', coordinates: [lon, lat] } };
        })
        .filter(Boolean);
      const out = { type: 'FeatureCollection', features };
      const json = JSON.stringify(out);
      if (json === (window as any).__lastTrainsJSON) return;
      (window as any).__lastTrainsJSON = json;
      requestAnimationFrame(() => {
        const source = map.getSource('trains') as maplibregl.GeoJSONSource;
        source.setData(out as any);
      });

      if (!didFitRef.current && features.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        for (const ft of features) bounds.extend(ft.geometry.coordinates as [number, number]);
        map.fitBounds(bounds, { padding: 60, duration: 500 });
        didFitRef.current = true;
      }
    };
    update();
    const handler = () => update();
    window.addEventListener('trains:update', handler as any);
    return () => window.removeEventListener('trains:update', handler as any);
  }, [map, qc, selectedTrain]);

  // Fly to selected train on selection change (read from cache)
  useEffect(() => {
    if (!map || !selectedTrain) return;
    const fc = qc.getQueryData<any>(['trains', 'live']);
    const found = fc?.features?.find((f: any) => f.properties?.id === selectedTrain);
    if (!found) return;
    const [lon, lat] = found.geometry.coordinates as [number, number];
    if (!isValidCoord(lon, lat)) return;
    const targetZoom = Math.max(map.getZoom(), 12);
    map.flyTo({ center: [lon, lat], zoom: targetZoom, duration: 400 });
  }, [map, selectedTrain, qc]);

  return null; // This component doesn't render anything visible
}

