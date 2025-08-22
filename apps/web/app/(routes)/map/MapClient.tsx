'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LiveSimLayer } from '@/features/map/LiveSimLayer';
import linesData from '@/data/lines-complete.json';
import { MapFiltersBar, type MapFilters } from '@/components/map/MapFiltersBar';

interface Train {
  id: string;
  status: string;
  lineId: string;
  region: string;
  position?: { lat: number; lng: number };
  delayMin?: number;
}

interface KPIs {
  total: number;
  active: number;
  maintenance: number;
  alarm: number;
  offline: number;
}

interface MapClientProps {
  initialTrains: Train[];
  initialKpis: KPIs;
}

export default function MapClient({ initialTrains, initialKpis }: MapClientProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapObj, setMapObj] = useState<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());

  const [trains, setTrains] = useState<Train[]>(initialTrains);
  const [kpis, setKpis] = useState<KPIs>(initialKpis);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    'active',
    'maintenance',
    'alarm',
    'offline',
  ]);
  const [includeReserve, setIncludeReserve] = useState<0 | 1>(1);
  const [searchQ, setSearchQ] = useState('');
  const [sseConnected, setSseConnected] = useState(false);
  // Linien-Metadaten
  type LineMeta = { id: string; name: string; color: string; region: 'BW' | 'BY' };
  const bwLines: LineMeta[] = ((linesData as any).baden_wuerttemberg ?? []).map((ln: any) => ({
    id: ln.id,
    name: ln.name,
    color: ln.color ?? '#3b82f6',
    region: 'BW',
  }));
  const byLines: LineMeta[] = ((linesData as any).bayern ?? []).map((ln: any) => ({
    id: ln.id,
    name: ln.name,
    color: ln.color ?? '#22c55e',
    region: 'BY',
  }));
  const allBWIds = bwLines.map((ln) => ln.id);
  const allBYIds = byLines.map((ln) => ln.id);
  const trainsAfterRegionStatus = trains.filter((t) => {
    if (selectedRegions.length > 0 && !selectedRegions.includes(t.region)) return false;
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(t.status)) return false;
    return true;
  });
  const countsByLine = trainsAfterRegionStatus.reduce(
    (acc, t) => {
      acc[t.lineId] = (acc[t.lineId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Filtere Züge basierend auf Auswahl
  const filteredTrains = trains.filter((train) => {
    if (selectedLines.length > 0 && !selectedLines.includes(train.lineId)) return false;
    if (selectedRegions.length > 0 && !selectedRegions.includes(train.region)) return false;
    // Reserve inclusion is controlled by toggle, not by status chips
    if (train.status === 'reserve' || train.status === 'standby') {
      if (!includeReserve) return false;
    } else {
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(train.status)) return false;
    }
    if (searchQ && !String(train.id).toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  // Berechne gefilterte KPIs
  const filteredKpis = filteredTrains.reduce(
    (acc, train) => {
      if (train.status === 'active') acc.active++;
      else if (train.status === 'maintenance') acc.maintenance++;
      else if (train.status === 'inspection' || train.status === 'alarm') acc.alarm++;
      else acc.offline++;
      return acc;
    },
    { total: filteredTrains.length, active: 0, maintenance: 0, alarm: 0, offline: 0 }
  );

  // Initialisiere Map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [10.0, 48.8], // Zentrum Deutschland (BW/BY)
      zoom: 7,
      pitch: 0,
      bearing: 0,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    if (map.current.isStyleLoaded()) {
      setMapObj(map.current);
    } else {
      map.current.once('load', () => setMapObj(map.current));
    }

    return () => {
      map.current?.remove();
      setMapObj(null);
    };
  }, []);

  // Legacy Marker deaktiviert – Interaktion erfolgt über LiveSimLayer
  useEffect(() => {
    markers.current.forEach((m) => m.remove());
    markers.current.clear();
  }, [filteredTrains]);

  // URL state sync for selected lines
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const lines = url.searchParams.get('lines');
      if (lines) setSelectedLines(lines.split(',').filter(Boolean));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (selectedLines.length > 0) url.searchParams.set('lines', selectedLines.join(','));
      else url.searchParams.delete('lines');
      const next = url.toString();
      if (next !== window.location.href) window.history.replaceState({}, '', next);
    } catch {}
  }, [selectedLines]);

  // SSE für Live-Updates (use local Next API stream). Fallback auf polling bei Fehlern
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/positions/stream`);
    } catch {}

    if (eventSource)
      eventSource.onopen = () => {
        setSseConnected(true);
        console.log('SSE verbunden');
      };

    if (eventSource)
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'train-update') {
            setTrains((prev) => {
              const updated = [...prev];
              const idx = updated.findIndex((t) => t.id === data.trainId);
              if (idx >= 0 && data.position) {
                updated[idx] = {
                  ...updated[idx],
                  position: { lat: data.position[1], lng: data.position[0] },
                  delayMin: data.delayMin,
                };
              }
              return updated;
            });
          }
        } catch (err) {
          console.error('SSE Fehler:', err);
        }
      };

    if (eventSource)
      eventSource.onerror = () => {
        setSseConnected(false);
        console.log('SSE getrennt');
        // no throw: keep UI usable
      };

    return () => {
      try {
        eventSource?.close();
      } catch {}
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* KPI-Leiste */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Live-Karte</h1>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-sm text-gray-400">{sseConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Gesamt (gefiltert)</div>
              <div className="text-2xl font-bold text-white">{filteredKpis.total}</div>
              <div className="text-xs text-gray-500 mt-1">
                von {kpis.total}{' '}
                {selectedLines.length || selectedRegions.length || selectedStatuses.length
                  ? '(Filter aktiv)'
                  : ''}
              </div>
            </div>

            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
              <div className="text-xs text-green-400 mb-1">Aktive</div>
              <div className="text-2xl font-bold text-green-400">{filteredKpis.active}</div>
              <div className="text-xs text-gray-500 mt-1">
                {((filteredKpis.active / Math.max(1, filteredKpis.total)) * 100).toFixed(0)}%
              </div>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3">
              <div className="text-xs text-yellow-400 mb-1">In Wartung</div>
              <div className="text-2xl font-bold text-yellow-400">{filteredKpis.maintenance}</div>
              <div className="text-xs text-gray-500 mt-1">
                {((filteredKpis.maintenance / Math.max(1, filteredKpis.total)) * 100).toFixed(0)}%
              </div>
            </div>

            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
              <div className="text-xs text-red-400 mb-1">Alarme</div>
              <div className="text-2xl font-bold text-red-400">{filteredKpis.alarm}</div>
              <div className="text-xs text-gray-500 mt-1">
                {((filteredKpis.alarm / Math.max(1, filteredKpis.total)) * 100).toFixed(0)}%
              </div>
            </div>

            <div className="bg-gray-600/30 border border-gray-500/30 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Offline</div>
              <div className="text-2xl font-bold text-gray-300">{filteredKpis.offline}</div>
              <div className="text-xs text-gray-500 mt-1">
                {((filteredKpis.offline / Math.max(1, filteredKpis.total)) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <MapFiltersBar
            linesOptions={[...new Set([...allBWIds, ...allBYIds])]}
            onChange={(f: MapFilters) => {
              setSelectedRegions(f.region);
              setSelectedLines(f.lines);
              setSelectedStatuses(f.status);
              setIncludeReserve(f.reserve);
              setSearchQ(f.q);
            }}
          />
        </div>
      </div>

      {/* Karte */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" data-testid="map-canvas" />
        {/* Simulierte Linien/Layer (Timetable/OSM Placeholder) */}
        <LiveSimLayer map={mapObj} visibleLines={selectedLines} />

        {/* Legende */}
        <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg p-3">
          <div className="text-sm font-semibold text-white mb-2">Legende</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-300">Aktiv</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-gray-300">In Wartung</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-300">Alarm/Inspektion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-xs text-gray-300">Offline/Standby</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
