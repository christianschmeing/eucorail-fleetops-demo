'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LiveSimLayer } from '@/features/map/LiveSimLayer';
import linesData from '@/data/lines-complete.json';

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
  const [sseConnected, setSseConnected] = useState(false);
  // Linien-Metadaten
  type LineMeta = { id: string; name: string; color: string; region: 'BW' | 'BY' };
  const bwLines: LineMeta[] = ((linesData as any).baden_wuerttemberg ?? []).map((l: any) => ({
    id: l.id,
    name: l.name,
    color: l.color ?? '#3b82f6',
    region: 'BW',
  }));
  const byLines: LineMeta[] = ((linesData as any).bayern ?? []).map((l: any) => ({
    id: l.id,
    name: l.name,
    color: l.color ?? '#22c55e',
    region: 'BY',
  }));
  const allBWIds = bwLines.map((l) => l.id);
  const allBYIds = byLines.map((l) => l.id);
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
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(train.status)) return false;
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

  // Update Markers wenn sich Züge oder Filter ändern
  useEffect(() => {
    if (!map.current) return;

    // Entferne alte Marker
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();

    // Füge neue Marker für gefilterte Züge hinzu
    filteredTrains.forEach((train) => {
      if (!train.position) return;

      const el = document.createElement('div');
      el.className = 'train-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      // Farbe basierend auf Status
      if (train.status === 'active') {
        el.style.backgroundColor = '#10b981'; // green
      } else if (train.status === 'maintenance') {
        el.style.backgroundColor = '#f59e0b'; // yellow
      } else if (train.status === 'alarm' || train.status === 'inspection') {
        el.style.backgroundColor = '#ef4444'; // red
      } else {
        el.style.backgroundColor = '#6b7280'; // gray
      }

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([train.position.lng, train.position.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${train.id}</div>
            <div style="font-size: 12px; color: #666;">
              Linie: ${train.lineId}<br/>
              Status: ${train.status}<br/>
              Region: ${train.region}<br/>
              ${train.delayMin ? `Verspätung: ${train.delayMin > 0 ? '+' : ''}${train.delayMin} min` : ''}
            </div>
            <div style="margin-top:6px"><a href="/trains/${encodeURIComponent(train.id)}" style="color:#60a5fa">Details</a></div>
          </div>
        `)
        )
        .addTo(map.current!);

      markers.current.set(train.id, marker);
    });
  }, [filteredTrains]);

  // SSE für Live-Updates (fallback auf absolute URL in Prod)
  useEffect(() => {
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:4100'
        : 'https://geolocation-mockup.vercel.app/api');
    const eventSource = new EventSource(`${API_URL}/events`);

    eventSource.onopen = () => {
      setSseConnected(true);
      console.log('SSE verbunden');
    };

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

    eventSource.onerror = () => {
      setSseConnected(false);
      console.log('SSE getrennt');
    };

    return () => {
      eventSource.close();
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

          {/* Filter */}
          <div className="mt-4 flex gap-4">
            <div className="flex gap-2">
              <span className="text-sm text-gray-400">Bundesland:</span>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selectedRegions.includes('BW')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRegions([...selectedRegions, 'BW']);
                    } else {
                      setSelectedRegions(selectedRegions.filter((r) => r !== 'BW'));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm text-white">BW</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selectedRegions.includes('BY')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRegions([...selectedRegions, 'BY']);
                    } else {
                      setSelectedRegions(selectedRegions.filter((r) => r !== 'BY'));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm text-white">BY</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 items-start">
              <span className="text-sm text-gray-400">Linie:</span>
              <div className="flex flex-wrap gap-2">
                {/* BW dynamisch */}
                <div className="flex gap-2 px-2 py-1 bg-blue-900/20 rounded">
                  <button
                    type="button"
                    className="px-2 py-0.5 text-xs bg-blue-800/60 rounded border border-blue-700 text-blue-100"
                    onClick={() =>
                      setSelectedLines(Array.from(new Set([...selectedLines, ...allBWIds])))
                    }
                  >
                    Alle BW
                  </button>
                  <button
                    type="button"
                    className="px-2 py-0.5 text-xs bg-blue-800/30 rounded border border-blue-700 text-blue-100"
                    onClick={() =>
                      setSelectedLines(selectedLines.filter((l) => !allBWIds.includes(l)))
                    }
                  >
                    BW aus
                  </button>
                  {bwLines.map((line) => (
                    <label
                      key={line.id}
                      className="flex items-center gap-1"
                      data-testid={`line-chip-${line.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLines.includes(line.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLines([...selectedLines, line.id]);
                          } else {
                            setSelectedLines(selectedLines.filter((l) => l !== line.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm" style={{ color: line.color }}>
                        {line.id}
                      </span>
                      <span className="text-[10px] text-gray-300">
                        ({countsByLine[line.id] || 0})
                      </span>
                    </label>
                  ))}
                </div>

                {/* BY dynamisch */}
                <div className="flex gap-2 px-2 py-1 bg-green-900/20 rounded">
                  <button
                    type="button"
                    className="px-2 py-0.5 text-xs bg-emerald-800/60 rounded border border-emerald-700 text-emerald-100"
                    onClick={() =>
                      setSelectedLines(Array.from(new Set([...selectedLines, ...allBYIds])))
                    }
                  >
                    Alle BY
                  </button>
                  <button
                    type="button"
                    className="px-2 py-0.5 text-xs bg-emerald-800/30 rounded border border-emerald-700 text-emerald-100"
                    onClick={() =>
                      setSelectedLines(selectedLines.filter((l) => !allBYIds.includes(l)))
                    }
                  >
                    BY aus
                  </button>
                  {byLines.map((line) => (
                    <label
                      key={line.id}
                      className="flex items-center gap-1"
                      data-testid={`line-chip-${line.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLines.includes(line.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLines([...selectedLines, line.id]);
                          } else {
                            setSelectedLines(selectedLines.filter((l) => l !== line.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm" style={{ color: line.color }}>
                        {line.id}
                      </span>
                      <span className="text-[10px] text-gray-300">
                        ({countsByLine[line.id] || 0})
                      </span>
                    </label>
                  ))}
                </div>

                {/* S-Bahn Linien entfernt (nicht Teil des Datensets) */}

                {/* Reserve */}
                <label className="flex items-center gap-1 px-2 py-1 bg-gray-600/20 rounded">
                  <input
                    type="checkbox"
                    checked={selectedLines.includes('RESERVE')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLines([...selectedLines, 'RESERVE']);
                      } else {
                        setSelectedLines(selectedLines.filter((l) => l !== 'RESERVE'));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">RESERVE</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="text-sm text-gray-400">Status:</span>
              {['active', 'maintenance', 'alarm', 'offline'].map((status) => (
                <label key={status} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(status)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStatuses([...selectedStatuses, status]);
                      } else {
                        setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-white">
                    {status === 'active'
                      ? 'Aktiv'
                      : status === 'maintenance'
                        ? 'Wartung'
                        : status === 'alarm'
                          ? 'Alarm'
                          : 'Offline'}
                  </span>
                </label>
              ))}
            </div>

            {(selectedLines.length > 0 ||
              selectedRegions.length > 0 ||
              selectedStatuses.length > 0) && (
              <button
                onClick={() => {
                  setSelectedLines([]);
                  setSelectedRegions([]);
                  setSelectedStatuses([]);
                }}
                className="ml-auto px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Karte */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />
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
