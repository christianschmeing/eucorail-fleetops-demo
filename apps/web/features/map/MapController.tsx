'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLivePositions } from '@/components/hooks/useSSETrains';
import type { SearchResult } from '@eucorail/ui';
import { TrainSearch } from '../search/TrainSearch';
import { MapFilters } from '../filters/MapFilters';
import { LiveMap } from './LiveMap';

interface Train {
  id: string;
  runId: string;
  line: string;
  region?: 'by' | 'bw';
  position: [number, number];
  speed: number;
  status: 'active' | 'maintenance' | 'alert';
  nextStop: string;
  delay: number;
}

const regionForLine = (line: string): 'by' | 'bw' => {
  const l = String(line).toUpperCase();
  if (l === 'RE8') return 'bw';
  return 'by';
};

const generateMockTrains = (): Train[] => {
  const lines = {
    RE9: { start: [10.8986, 48.3668], end: [9.9876, 48.4011], count: 4 },
    MEX16: { start: [9.177, 48.7823], end: [9.9876, 48.4011], count: 4 },
    RE8: { start: [9.177, 48.7823], end: [9.9534, 49.7913], count: 5 },
  } as const;

  const trains: Train[] = [];
  Object.entries(lines).forEach(([line, cfg]) => {
    for (let i = 0; i < cfg.count; i++) {
      const progress = Math.random();
      const lat = cfg.start[1] + (cfg.end[1] - cfg.start[1]) * progress;
      const lng = cfg.start[0] + (cfg.end[0] - cfg.start[0]) * progress;
      const id = line === 'RE9' ? `7800${i + 1}` : line === 'MEX16' ? `6600${i + 1}` : `7900${i + 1}`;
      const lineKey = line as keyof typeof lines;
      trains.push({
        id,
        runId: `${line}-${id}`,
        line,
        region: regionForLine(lineKey),
        position: [lng, lat],
        speed: 80 + Math.floor(Math.random() * 60),
        status: Math.random() > 0.8 ? 'maintenance' : Math.random() > 0.95 ? 'alert' : 'active',
        nextStop: progress < 0.5 ? 'Endstation' : 'Zwischenhalt',
        delay: Math.random() > 0.7 ? Math.floor(Math.random() * 10) : 0,
      });
    }
  });
  return trains;
};

export const MapController: React.FC = () => {
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({ state: [], line: [], status: [] });
  const [loading] = useState(false);

  useEffect(() => {
    // initial load from same-origin API (Vercel-friendly); fallback to generated
    const load = async () => {
      try {
        const r = await fetch('/api/trains', { cache: 'no-store' });
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data)) {
            setTrains(data);
          } else {
            setTrains(generateMockTrains());
          }
        } else {
          setTrains(generateMockTrains());
        }
      } catch {
        setTrains(generateMockTrains());
      }
    };
    load();
    const interval = setInterval(() => {
      setTrains((prev) =>
        prev.map((t) => ({
          ...t,
          position: [t.position[0] + (Math.random() - 0.5) * 0.01, t.position[1] + (Math.random() - 0.5) * 0.01],
          speed: Math.max(0, t.speed + (Math.random() - 0.5) * 10),
        }))
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Live positions via SSE with snapshot fallback; update KPIs within 2s
  useLivePositions((payload) => {
    const arr = Array.isArray(payload?.items) ? payload.items : [];
    if (arr.length > 0) {
      setTrains(
        arr.map((it: any) => ({
          id: String(it.id),
          runId: String(it.id),
          line: String(it.line || 'RE9'),
          region: String(it.region || 'BY').toLowerCase() as 'by' | 'bw',
          position: it.position as [number, number],
          speed: Number(it.speed || 100),
          status: (it.status || 'active') as any,
          nextStop: '—',
          delay: Number(it.delay || 0),
        }))
      );
    }
  });

  const handleTrainSelect = (result: SearchResult) => {
    // Try exact id, then numeric match inside id (e.g., 'RE9-78001' includes '78001')
    const numeric = String(result.id).replace(/[^0-9]/g, '');
    const train =
      trains.find((t) => String(t.id) === result.id) ||
      trains.find((t) => String(t.id).includes(numeric));
    if (train) setSelectedTrain(train);
  };

  const handleFilterChange = (newFilters: Record<string, string[]>) => {
    setFilters(newFilters);
  };

  const filteredTrains = useMemo(
    () =>
      trains.filter((t) => {
        const lineOk = filters.line.length === 0 || filters.line.includes(t.line.toLowerCase());
        const statusOk = filters.status.length === 0 || filters.status.includes(t.status);
        const stateOk = filters.state.length === 0 || (t.region ? filters.state.includes(t.region) : true);
        return lineOk && statusOk && stateOk;
      }),
    [trains, filters]
  );

  // Ensure selected train marker stays visible even if filters would hide it
  const trainsToRender = useMemo(() => {
    if (!selectedTrain) return filteredTrains;
    if (filteredTrains.find((t) => t.id === selectedTrain.id)) return filteredTrains;
    return [...filteredTrains, selectedTrain];
  }, [filteredTrains, selectedTrain]);

  // KPIs derived from filtered view
  const { activeCount, maintCount, alertCount, avgDelay } = useMemo(() => {
    const total = filteredTrains.length || 1;
    const active = filteredTrains.filter((t) => t.status === 'active').length;
    const maint = filteredTrains.filter((t) => t.status === 'maintenance').length;
    const alert = filteredTrains.filter((t) => t.status === 'alert').length;
    const delays = filteredTrains.map((t) => t.delay || 0);
    const avg = delays.length > 0 ? Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10 : 0;
    return { activeCount: active, maintCount: maint, alertCount: alert, avgDelay: avg };
  }, [filteredTrains]);

  // Keep selectedTrain reference fresh with latest position/speed from source array
  useEffect(() => {
    if (!selectedTrain) return;
    const updated = trains.find((t) => t.id === selectedTrain.id);
    if (updated && (updated.position !== selectedTrain.position || updated.speed !== selectedTrain.speed)) {
      setSelectedTrain(updated);
    }
  }, [trains, selectedTrain]);

  return (
    <div className="flex h-screen">
      <div className="w-80 bg-white shadow-lg z-10 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="border-b pb-4">
            <h1 className="text-xl font-bold text-gray-800">Eucorail FleetOps</h1>
            <p className="text-sm text-gray-600">Live Zugverfolgung</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Zugsuche</h2>
            <TrainSearch onSelect={handleTrainSelect} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Filter</h2>
            <MapFilters onFiltersChange={handleFilterChange} currentFilters={filters} />
          </div>

          <div className="border-t pt-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Status Übersicht</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Aktive Züge</span><span className="font-medium">{activeCount}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">In Wartung</span><span className="font-medium text-yellow-600">{maintCount}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Alarme</span><span className="font-medium text-red-600">{alertCount}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Ø Verspätung</span><span className="font-medium">{avgDelay} min</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Gesamt (gefiltert)</span><span className="font-medium">{filteredTrains.length}</span></div>
            </div>
            {/* Donut-Chart Status-Verteilung */}
            <div className="mt-3 flex items-center justify-center">
              {(() => {
                const total = Math.max(1, filteredTrains.length);
                const a = activeCount / total;
                const m = maintCount / total;
                const al = alertCount / total;
                const aEnd = a * 360;
                const mEnd = (a + m) * 360;
                const alEnd = 360; // rest
                const bg = `conic-gradient(#10B981 0deg ${aEnd}deg, #F59E0B ${aEnd}deg ${mEnd}deg, #EF4444 ${mEnd}deg ${alEnd}deg)`;
                return (
                  <div style={{ width: 120, height: 120, borderRadius: 9999, background: bg, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 12, borderRadius: 9999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#374151' }}>
                      {filteredTrains.length}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {selectedTrain && (
            <div className="border-t pt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Zugdetails</h2>
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <div className="font-medium text-blue-900">
                  {selectedTrain.line} {selectedTrain.id}
                </div>
                <div className="text-blue-700 mt-1">
                  <div>Geschwindigkeit: {selectedTrain.speed} km/h</div>
                  <div>Nächster Halt: {selectedTrain.nextStop}</div>
                  <div>Verspätung: {selectedTrain.delay} min</div>
                  <div className="mt-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedTrain.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : selectedTrain.status === 'maintenance'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedTrain.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow px-3 py-2 z-10">
            <div className="flex items-center space-x-2">
              <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
              <span className="text-sm text-gray-600">Lade Züge...</span>
            </div>
          </div>
        )}
        <LiveMap
          trains={trainsToRender}
          selectedTrain={selectedTrain}
          onTrainClick={(t) => setSelectedTrain(t)}
        />

        {/* Sliding details panel */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            height: '100%',
            width: selectedTrain ? 340 : 0,
            transition: 'width 220ms ease',
            background: '#fff',
            overflow: 'hidden',
            boxShadow: selectedTrain ? '-8px 0 24px rgba(0,0,0,0.12)' : 'none',
          }}
        >
          {selectedTrain && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <div className="text-xs text-gray-500">Ausgewählt</div>
                <div className="text-lg font-semibold">{selectedTrain.line} {selectedTrain.id}</div>
                <div className="text-xs text-gray-600 mt-1">{(selectedTrain.region || '').toUpperCase()} • Nächster Halt: {selectedTrain.nextStop}</div>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-gray-600">Geschwindigkeit</span><span className="font-medium">{selectedTrain.speed} km/h</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-600">Verspätung</span><span className={selectedTrain.delay>0?"font-medium text-red-600":"font-medium"}>+{selectedTrain.delay} min</span></div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={selectedTrain.status==='active'?"px-2 py-1 rounded bg-green-100 text-green-800":selectedTrain.status==='maintenance'?"px-2 py-1 rounded bg-yellow-100 text-yellow-800":"px-2 py-1 rounded bg-red-100 text-red-800"}>{selectedTrain.status}</span>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Wartungshistorie</div>
                  <ul className="space-y-1">
                    <li className="flex items-center justify-between"><span>HVAC Filter</span><span className="text-gray-500">vor 3 Tagen</span></li>
                    <li className="flex items-center justify-between"><span>Bremsen-Check</span><span className="text-gray-500">vor 1 Woche</span></li>
                    <li className="flex items-center justify-between"><span>ETCS Reset</span><span className="text-gray-500">vor 2 Wochen</span></li>
                  </ul>
                </div>
              </div>
              <div className="mt-auto p-4 border-t text-right">
                <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={() => setSelectedTrain(null)}>Schließen</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


