'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import TrainMarkers from './TrainMarkers';
import FleetHealthWidget from './dashboard/FleetHealthWidget';
import MaintenanceCalendar from './dashboard/MaintenanceCalendar';
import AlertsSummary from './dashboard/AlertsSummary';
import EnergyGauge from './dashboard/EnergyGauge';
import PunctualityChart from './dashboard/PunctualityChart';
import PassengerFlow from './dashboard/PassengerFlow';
import WeatherPanel from './dashboard/WeatherPanel';
import PerformanceKPIs from './dashboard/PerformanceKPIs';
import TrainPopup from './TrainPopup';
import { useQueryClient } from '@tanstack/react-query';
import { KPIStat } from './KPIStat';
import { useFleetStore } from '@/lib/state/fleet-store';

export default function MapShell({
  externalActiveLines,
  onlyActive = false,
  showHeader = true,
  showSidebar = true,
  showDetails = true,
}: {
  externalActiveLines?: string[];
  onlyActive?: boolean;
  showHeader?: boolean;
  showSidebar?: boolean;
  showDetails?: boolean;
} = {}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === '1';
  const debugLogs = process.env.NEXT_PUBLIC_DEBUG === '1';
  // Ensure API base is visible for debugging fetch failures
  try {
    (window as any).__apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';
  } catch {}
  const [selectedTrain, setSelectedTrain] = useState<string | null>(
    isTestMode ? 'RE9-78001' : null
  );
  const [trainCount, setTrainCount] = useState(0);
  const [sseConnected, setSseConnected] = useState(false);
  const [activeLines, setActiveLines] = useState<string[]>([]);
  const [simOffsetMin, setSimOffsetMin] = useState<number>(0); // playback offset
  const [fleetHealth, setFleetHealth] = useState({
    active: 7,
    maintenance: 2,
    inspection: 1,
    stationary: 2,
  });
  const [recentMessages, setRecentMessages] = useState([
    {
      id: 1,
      trainId: 'RE9-78001',
      message: 'Wartung fällig - Depot Langweid',
      type: 'warning',
      timestamp: '10:23',
    },
    {
      id: 2,
      trainId: 'MEX16-66012',
      message: 'ETCS-System gestört',
      type: 'error',
      timestamp: '10:15',
    },
    {
      id: 3,
      trainId: 'RE8-79021',
      message: 'Pünktlich in Stuttgart Hbf',
      type: 'info',
      timestamp: '10:08',
    },
    {
      id: 4,
      trainId: 'RE9-78002',
      message: 'Geschwindigkeit normalisiert',
      type: 'info',
      timestamp: '09:55',
    },
  ]);

  // Global flag to prevent duplicate depot source creation
  const depotSourceAddedRef = useRef(false);
  const qc = useQueryClient();
  const [showMessages, setShowMessages] = useState(false);
  const [is3D, setIs3D] = useState(false);
  // Attach TCMS SSE listener once
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/tcms/stream');
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data?.type === 'tcms' && data.event) {
            useFleetStore.getState().addTcmsEvent(data.event);
          }
        } catch {}
      };
      // Also poll seed/events periodically to ensure data presence on first load
      const poll = setInterval(async () => {
        try {
          const r = await fetch('/api/tcms/events', { cache: 'no-store' });
          const j = await r.json();
          if (Array.isArray(j.events)) {
            for (const e of j.events) useFleetStore.getState().addTcmsEvent(e);
          }
        } catch {}
      }, 10000);
      (window as any).__tcmsPoll = poll;
    } catch {}
    return () => {
      try {
        es?.close();
        const poll: any = (window as any).__tcmsPoll;
        if (poll) clearInterval(poll);
      } catch {}
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    if (debugLogs) console.log('🗺️ Creating map instance...');

    try {
      const mapStyle =
        process.env.NEXT_PUBLIC_MAP_STYLE ||
        'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        // Always use a neutral basemap to avoid yellow background in tests
        style: mapStyle,
        center: [10.5, 48.5], // Center of Bavaria/Baden-Württemberg
        zoom: 8,
        maxZoom: 18,
        minZoom: 6,
      });

      if (debugLogs) console.log('🗺️ Map instance created, adding controls...');
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      // Add rail layer when map loads
      map.on('load', () => {
        if (debugLogs) console.log('✅ Map loaded successfully');
        setReady(true);

        // Signal map ready after idle once sources/layers are set up
        map.once('idle', () => {
          try {
            (window as any).__mapReady = true;
          } catch {}
          try {
            window.dispatchEvent(new CustomEvent('map:ready'));
          } catch {}
        });
      });
      // Defensive: avoid console noise if style tiles fail
      (map as any).on('error', (e: any) => {
        if (debugLogs) console.warn('Map error suppressed:', e?.error || e);
      });

      mapRef.current = map;

      return () => {
        if (mapRef.current) {
          if (debugLogs) console.log('🗺️ Cleaning up map on unmount...');
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (error) {
      if (debugLogs) console.error('❌ Error creating map:', error);
    }
  }, []);

  // Read URL params on mount (lines, sim)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const linesParam = url.searchParams.get('lines');
      const simParam = url.searchParams.get('sim');
      if (linesParam) setActiveLines(linesParam.split(',').filter(Boolean));
      if (simParam) setSimOffsetMin(parseInt(simParam));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filter/time to URL (debounced a bit by rAF)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (activeLines.length > 0) url.searchParams.set('lines', activeLines.join(','));
      else url.searchParams.delete('lines');
      if (simOffsetMin !== 0) url.searchParams.set('sim', String(simOffsetMin));
      else url.searchParams.delete('sim');
      const next = url.toString();
      if (next !== window.location.href) window.history.replaceState({}, '', next);
    } catch {}
  }, [activeLines, simOffsetMin]);

  // Keyboard shortcuts (disabled in test mode)
  useEffect(() => {
    if (isTestMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '3') {
        const m = mapRef.current;
        if (!m) return;
        const next = !is3D;
        setIs3D(next);
        try {
          m.easeTo({ pitch: next ? 60 : 0, duration: 600 });
        } catch {}
      } else if (e.key.toLowerCase() === 'm') {
        setShowMessages((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [is3D, isTestMode]);

  // In TEST_MODE allow selecting a train via URL query (?select=TRAIN_ID)
  useEffect(() => {
    if (!isTestMode || selectedTrain) return;
    try {
      const url = new URL(window.location.href);
      const sel = url.searchParams.get('select');
      if (sel) {
        setSelectedTrain(sel);
      } else {
        // Fallback default selection to stabilize tests
        setSelectedTrain('RE9-78001');
      }
    } catch {}
  }, [isTestMode, selectedTrain]);

  // TEST HUD: wire SSE/open/error and update train count from React Query cache
  useEffect(() => {
    if (!isTestMode) return;
    const updateCount = () => {
      const fc = qc.getQueryData<any>(['trains', 'live']);
      const count = Array.isArray(fc?.features) ? fc.features.length : 0;
      setTrainCount(count);
    };
    updateCount();
    const onUpdate = () => updateCount();
    const onOpen = () => setSseConnected(true);
    const onError = () => setSseConnected(false);
    window.addEventListener('trains:update', onUpdate as any);
    window.addEventListener('sse:open', onOpen as any);
    window.addEventListener('sse:error', onError as any);
    return () => {
      window.removeEventListener('trains:update', onUpdate as any);
      window.removeEventListener('sse:open', onOpen as any);
      window.removeEventListener('sse:error', onError as any);
    };
  }, [qc, isTestMode]);

  // Load depot data when map is ready
  useEffect(() => {
    if (!ready || !mapRef.current || depotSourceAddedRef.current) return;

    const initDepots = () => {
      const m = mapRef.current;
      if (!m || depotSourceAddedRef.current) return;
      fetch('/config/depots.json')
        .then((res) => res.json())
        .then((data) => {
          console.log('Loading depot data:', data);
          if (m && !m.getSource('depots') && !depotSourceAddedRef.current) {
            m.addSource('depots', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: data.depots.map((depot: any) => ({
                  type: 'Feature',
                  properties: { id: depot.id, name: depot.name, type: 'depot' },
                  geometry: {
                    type: 'Point',
                    coordinates: [depot.lon, depot.lat],
                  },
                })),
              },
            });
            // Add circle layer for depots (no external sprite needed)
            if (m && !m.getLayer('depots-circles')) {
              m.addLayer({
                id: 'depots-circles',
                type: 'circle',
                source: 'depots',
                paint: {
                  'circle-radius': 6,
                  'circle-color': '#FF6B35',
                  'circle-stroke-color': '#0B1F2A',
                  'circle-stroke-width': 2,
                },
              });
            }
            if (m && !m.getLayer('depots-labels')) {
              m.addLayer({
                id: 'depots-labels',
                type: 'symbol',
                source: 'depots',
                layout: {
                  'text-field': ['get', 'name'],
                  'text-size': 12,
                  'text-offset': [0, 1.0],
                  'text-anchor': 'top',
                },
                paint: {
                  'text-color': '#FF6B35',
                  'text-halo-color': '#0B1F2A',
                  'text-halo-width': 2,
                },
              });
            }

            depotSourceAddedRef.current = true;
            console.log('✅ Depot source and layers added successfully');
          }
        })
        .catch((err) => {
          if (debugLogs) console.error('Failed to load depots:', err);
          const m = mapRef.current;
          if (m && !m.getSource('depots') && !depotSourceAddedRef.current) {
            const fallbackDepots = [
              { id: 'langweid', name: 'Langweid', lon: 10.8569, lat: 48.4908 },
              { id: 'essingen', name: 'Essingen', lon: 9.3072, lat: 48.8089 },
            ];
            m.addSource('depots', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: fallbackDepots.map((depot) => ({
                  type: 'Feature',
                  properties: { id: depot.id, name: depot.name, type: 'depot' },
                  geometry: {
                    type: 'Point',
                    coordinates: [depot.lon, depot.lat],
                  },
                })),
              },
            });
            if (m && !m.getLayer('depots-circles')) {
              m.addLayer({
                id: 'depots-circles',
                type: 'circle',
                source: 'depots',
                paint: {
                  'circle-radius': 6,
                  'circle-color': '#FF6B35',
                  'circle-stroke-color': '#0B1F2A',
                  'circle-stroke-width': 2,
                },
              });
            }
            if (m && !m.getLayer('depots-labels')) {
              m.addLayer({
                id: 'depots-labels',
                type: 'symbol',
                source: 'depots',
                layout: {
                  'text-field': ['get', 'name'],
                  'text-size': 12,
                  'text-offset': [0, 1.0],
                  'text-anchor': 'top',
                },
                paint: {
                  'text-color': '#FF6B35',
                  'text-halo-color': '#0B1F2A',
                  'text-halo-width': 2,
                },
              });
            }

            depotSourceAddedRef.current = true;
            if (debugLogs) console.log('✅ Fallback depot source and layers added successfully');
          }
        });
    };

    // Ensure style is fully loaded before mutating sources/layers
    if (!mapRef.current.isStyleLoaded()) {
      const onLoad = () => {
        try {
          mapRef.current?.off('load', onLoad as any);
        } catch {}
        initDepots();
      };
      mapRef.current.on('load', onLoad as any);
      return () => {
        try {
          mapRef.current?.off('load', onLoad as any);
        } catch {}
      };
    }

    initDepots();
  }, [ready]);

  // Handle train selection
  const handleTrainSelect = (trainId: string) => {
    setSelectedTrain(trainId);
    try {
      (window as any).__selectedTrain = trainId;
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('selected:train', { detail: trainId }));
    } catch {}
    if (debugLogs) console.log('🚂 Train selected in MapShell:', trainId);
  };

  // Wire test HUD synthetic select buttons
  useEffect(() => {
    const onTestSelect = (e: any) => {
      const id = e?.detail as string;
      if (id) handleTrainSelect(id);
    };
    window.addEventListener('test:selectTrain', onTestSelect as any);
    return () => window.removeEventListener('test:selectTrain', onTestSelect as any);
  }, []);

  // Health check system
  const getHealthScore = (trainId: string): number => {
    // Simulate health scores based on train ID
    const scores: Record<string, number> = {
      'RE9-78001': 65, // Maintenance due
      'RE9-78002': 92,
      'RE8-79021': 88,
      'RE8-79022': 95,
      'MEX16-66011': 78,
      'MEX16-66012': 45, // Inspection due
      'BY-12345': 82,
      'BW-67890': 90,
    };
    return scores[trainId] || 85;
  };

  const getHealthColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBadge = (score: number): string => {
    if (score >= 80) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const getSubsystemStatus = (trainId: string) => {
    // Simulate subsystem statuses
    const subsystems = {
      'RE9-78001': {
        antrieb: 'warning',
        bremse: 'ok',
        etcs: 'ok',
        tueren: 'critical',
        hvac: 'ok',
        energie: 'warning',
      },
      'MEX16-66012': {
        antrieb: 'ok',
        bremse: 'warning',
        etcs: 'critical',
        tueren: 'ok',
        hvac: 'ok',
        energie: 'warning',
      },
    };
    return (
      subsystems[trainId as keyof typeof subsystems] || {
        antrieb: 'ok',
        bremse: 'ok',
        etcs: 'ok',
        tueren: 'ok',
        hvac: 'ok',
        energie: 'ok',
      }
    );
  };

  // Expose an imperative helper for tests to set the selection deterministically
  useEffect(() => {
    try {
      (window as any).setSelectedTrain = (id: string) => handleTrainSelect(id);
    } catch {}
  }, []);

  // Reflect current selection to a global for tests waiting on __selectedTrain
  useEffect(() => {
    try {
      (window as any).__selectedTrain = selectedTrain;
    } catch {}
  }, [selectedTrain]);

  const effectiveLines = externalActiveLines ?? activeLines;

  return (
    <div className="h-screen w-screen bg-euco-bg text-white overflow-hidden" data-testid="map-root">
      {/* Header */}
      {showHeader && (
        <header className="bg-black/30 border-b border-white/10 px-6 py-4 relative z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-euco-accent rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">E</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Eucorail FleetOps</h1>
                <p className="text-sm text-euco-muted">
                  Live-Map für Regionalzüge in Bayern und Baden-Württemberg
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <KPIStat
                label="Verfügbarkeit"
                value="97.2%"
                trend="up"
                data-testid="kpi-availability"
              />
              <KPIStat label="Ø Verspätung" value="+2.8 min" trend="down" data-testid="kpi-delay" />
              <KPIStat
                label="Störungen aktiv"
                value={`${fleetHealth.inspection}`}
                trend="flat"
                data-testid="kpi-faults"
              />
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-euco-accent2 rounded-full animate-pulse"></div>
                <span className="text-sm text-euco-accent2">System Online</span>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className={showHeader ? 'flex h-[calc(100vh-80px)]' : 'flex h-[100vh]'}>
        {/* Left Sidebar - Train List */}
        {showSidebar && (
          <aside
            className="w-80 bg-black/40 border-r border-white/10 overflow-y-auto flex-shrink-0"
            aria-label="Zugliste"
            data-testid="sidebar"
          >
            <div className="p-4 sticky top-0 z-10 bg-black/50 backdrop-blur-sm border-b border-white/10">
              <h2 className="text-lg font-semibold mb-4">Zugliste</h2>
              {/* Filter Tiles */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button className="bg-black/30 hover:bg-white/10 px-3 py-2 rounded-xl text-sm transition-colors">
                  Alle Züge
                </button>
                <button className="bg-black/30 hover:bg-white/10 px-3 py-2 rounded-xl text-sm transition-colors">
                  Nur Aktiv
                </button>
              </div>
              {/* Time slider */}
              <div className="mb-3">
                <label className="block text-xs text-euco-muted mb-1">
                  Zeit (−2h … jetzt … +2h)
                </label>
                <input
                  type="range"
                  min={-120}
                  max={120}
                  step={5}
                  value={simOffsetMin}
                  onChange={(e) => setSimOffsetMin(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-euco-muted mt-1">{simOffsetMin} min</div>
              </div>
              {/* Line Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['RE9', 'RE8', 'MEX16'].map((code) => (
                  <button
                    key={code}
                    className={`${activeLines.includes(code) ? 'bg-euco-accent text-black' : 'bg-black/30 hover:bg-white/10'} px-3 py-1 rounded-xl text-xs transition-colors`}
                    onClick={() =>
                      setActiveLines((prev) =>
                        prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
                      )
                    }
                  >
                    {code}
                  </button>
                ))}
              </div>
              {/* Train List */}
              <div className="space-y-2 pt-4" data-testid="train-list">
                {[
                  {
                    id: 'RE9-78001',
                    name: 'RE9 78001',
                    status: 'maintenance',
                    speed: 0,
                    health: 65,
                  },
                  { id: 'RE9-78002', name: 'RE9 78002', status: 'active', speed: 85, health: 92 },
                  { id: 'RE8-79021', name: 'RE8 79021', status: 'active', speed: 92, health: 88 },
                  { id: 'RE8-79022', name: 'RE8 79022', status: 'active', speed: 78, health: 95 },
                  {
                    id: 'MEX16-66011',
                    name: 'MEX16 66011',
                    status: 'active',
                    speed: 95,
                    health: 78,
                  },
                  {
                    id: 'MEX16-66012',
                    name: 'MEX16 66012',
                    status: 'inspection',
                    speed: 0,
                    health: 45,
                  },
                  { id: 'BY-12345', name: 'BY 12345', status: 'stationary', speed: 0, health: 82 },
                  { id: 'BW-67890', name: 'BW 67890', status: 'stationary', speed: 0, health: 90 },
                ].map((train) => (
                  <div
                    key={train.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTrain === train.id
                        ? 'bg-euco-accent text-black'
                        : 'bg-black/30 hover:bg-white/10'
                    }`}
                    data-testid="train-item"
                    onClick={() => handleTrainSelect(train.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{train.name}</div>
                        <div className="text-xs opacity-75">
                          {train.status === 'active' ? `${train.speed} km/h` : train.status}
                        </div>
                      </div>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          train.status === 'active'
                            ? 'bg-green-400'
                            : train.status === 'maintenance'
                              ? 'bg-yellow-400'
                              : train.status === 'inspection'
                                ? 'bg-red-400'
                                : 'bg-gray-400'
                        }`}
                      ></div>
                    </div>
                    {isTestMode && (
                      <div className="mt-2">
                        <button
                          type="button"
                          data-testid="open-details"
                          className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrainSelect(train.id);
                          }}
                          aria-label={`Details anzeigen für ${train.name}`}
                        >
                          Details anzeigen
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Main Map Area */}
        <main className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full" data-testid="map-canvas" />
          {/* Map Controls Overlay */}
          <div className="absolute top-4 left-4 space-y-2">
            <button
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 p-2 rounded-lg transition-colors"
              onClick={() => {
                const first =
                  effectiveLines && effectiveLines.length > 0 ? effectiveLines[0] : null;
                if (!mapRef.current) return;
                if (first === 'RE9')
                  mapRef.current.fitBounds(
                    [
                      [10.05, 48.3],
                      [10.97, 48.6],
                    ],
                    { padding: 40, duration: 300 }
                  );
                else if (first === 'MEX16')
                  mapRef.current.fitBounds(
                    [
                      [9.1, 48.65],
                      [10.05, 48.75],
                    ],
                    { padding: 40, duration: 300 }
                  );
                else if (first === 'RE8')
                  mapRef.current.fitBounds(
                    [
                      [9.05, 48.7],
                      [10.0, 49.9],
                    ],
                    { padding: 40, duration: 300 }
                  );
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            <button
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 p-2 rounded-lg transition-colors"
              onClick={() => {
                if (selectedTrain && mapRef.current) {
                  // simple focus; real impl uses geo lookup
                  try {
                    mapRef.current.easeTo({
                      center: mapRef.current.getCenter(),
                      zoom: 10,
                      duration: 300,
                    });
                  } catch {}
                }
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </div>
          {/* Recent Messages Overlay */}
          <div className="absolute top-4 right-4 lg:right-96 w-80 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 z-20">
            <div
              className="p-4"
              style={{ display: (isTestMode || selectedTrain) && showMessages ? 'block' : 'none' }}
            >
              <h3 className="text-sm font-semibold mb-3">Letzte Meldungen</h3>
              <div className="space-y-2">
                {recentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                      message.type === 'error'
                        ? 'bg-red-500/20 text-red-300'
                        : message.type === 'warning'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-blue-500/20 text-blue-300'
                    }`}
                    onClick={() => handleTrainSelect(message.trainId)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{message.trainId}</span>
                      <span className="opacity-75">{message.timestamp}</span>
                    </div>
                    <div className="mt-1">{message.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dashboard Widgets (hidden in test mode to keep snapshots stable) */}
          {/* widgets removed */}
        </main>

        {/* Right Sidebar - Selected Train Details (collapsible) */}
        {showDetails && (
          <aside
            className="w-96 bg-black/30 border-l border-white/10 overflow-y-auto sticky top-0 h-full z-10"
            data-testid="train-drawer"
            aria-label="Zug Details"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Zug Details</h2>
                <div className="text-xs text-euco-muted">
                  {selectedTrain ? 'Ausgewählt' : 'Kein Zug ausgewählt'}
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-black/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">
                    {selectedTrain || 'Bitte einen Zug auswählen'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-euco-muted">Status:</span>
                      <span className="ml-2 text-green-400">{selectedTrain ? 'Aktiv' : '–'}</span>
                    </div>
                    <div>
                      <span className="text-euco-muted">Geschwindigkeit:</span>
                      <span className="ml-2">{selectedTrain ? '85 km/h' : '–'}</span>
                    </div>
                    <div>
                      <span className="text-euco-muted">Position:</span>
                      <span className="ml-2">{selectedTrain ? '48.5°N, 10.5°E' : '–'}</span>
                    </div>
                    <div>
                      <span className="text-euco-muted">Route:</span>
                      <span className="ml-2">
                        {selectedTrain ? 'München Hbf → Nürnberg Hbf' : '–'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-black/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Systemstatus</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Gesundheit</span>
                      <span
                        className={`text-sm font-medium ${getHealthColor(getHealthScore(selectedTrain || 'RE9-78001'))}`}
                      >
                        {selectedTrain ? getHealthScore(selectedTrain || 'RE9-78001') : '–'}
                        {selectedTrain ? '%' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-400 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: selectedTrain
                            ? `${getHealthScore(selectedTrain || 'RE9-78001')}%`
                            : '0%',
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="bg-black/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Teilsysteme</h3>
                  <div className="space-y-2">
                    {Object.entries(getSubsystemStatus(selectedTrain || 'RE9-78001')).map(
                      ([system, status]) => (
                        <div key={system} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{system}</span>
                          <div
                            className={`w-3 h-3 rounded-full ${
                              status === 'ok'
                                ? 'bg-green-400'
                                : status === 'warning'
                                  ? 'bg-yellow-400'
                                  : 'bg-red-400'
                            }`}
                          ></div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Train Markers Component */}
      <TrainMarkers
        map={mapRef.current}
        selectedTrain={selectedTrain}
        onTrainSelect={handleTrainSelect}
        lineFilter={activeLines}
        simOffsetMin={simOffsetMin}
      />

      {/* Train maintenance popup with focus on technical condition */}
      {selectedTrain && (
        <TrainPopup trainId={selectedTrain} onClose={() => setSelectedTrain(null)} />
      )}

      {/* Shortcuts helper (only outside test mode) */}
      {/* shortcuts removed */}
    </div>
  );
}
