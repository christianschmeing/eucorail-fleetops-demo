'use client';

import { useState, useMemo, useCallback } from 'react';
import { Allocation, MovePlan, DepotKPI, generateConflicts } from '../depot-data';
import { TrackGeometry } from '../track-geometries';
import DepotMapInspector from './DepotMapInspector';
import DepotMapFilters from './DepotMapFilters';
import DepotMapQueue from './DepotMapQueue';
import DepotMapGL from './DepotMapGL';

interface DepotMapClientProps {
  tracks: TrackGeometry[];
  allocations: Allocation[];
  movePlans: MovePlan[];
  kpis: DepotKPI;
}

export default function DepotMapClient({
  tracks: initialTracks,
  allocations: initialAllocations,
  movePlans: initialMovePlans,
  kpis: initialKpis,
}: DepotMapClientProps) {
  const [selectedDepot, setSelectedDepot] = useState<'Essingen' | 'Langweid'>('Essingen');
  const [showPhase2, setShowPhase2] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackGeometry | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);
  const [mapView, setMapView] = useState<'streets' | 'satellite'>('streets');
  const [filter, setFilter] = useState({
    status: 'all' as 'all' | Allocation['status'],
    isLevel: 'all' as 'all' | Allocation['purpose'],
    line: 'all' as 'all' | string,
    feature: 'all' as 'all' | string,
  });

  const [tracks] = useState(initialTracks);
  const [allocations, setAllocations] = useState(initialAllocations);
  const [movePlans] = useState(initialMovePlans);
  const [kpis] = useState(initialKpis);

  // Generate conflicts
  const conflicts = useMemo(() => generateConflicts(allocations), [allocations]);

  // Filter tracks by depot and phase 2
  const filteredTracks = useMemo(() => {
    let filtered = tracks.filter((t) => t.depot === selectedDepot);
    if (!showPhase2 && selectedDepot === 'Langweid') {
      filtered = filtered.filter((t) => !t.name.includes('Phase 2'));
    }
    return filtered;
  }, [tracks, selectedDepot, showPhase2]);

  // Filter allocations by current filters
  const filteredAllocations = useMemo(() => {
    let filtered = allocations.filter((a) => filteredTracks.some((t) => t.id === a.trackId));

    if (filter.status !== 'all') {
      filtered = filtered.filter((a) => a.status === filter.status);
    }
    if (filter.isLevel !== 'all') {
      filtered = filtered.filter((a) => a.purpose === filter.isLevel);
    }
    if (filter.line !== 'all') {
      filtered = filtered.filter((a) => a.line_code === filter.line);
    }

    return filtered;
  }, [allocations, filteredTracks, filter]);

  // Filter move plans by depot
  const filteredMovePlans = useMemo(() => {
    return movePlans.filter((plan) => {
      if (plan.to.trackId) {
        const track = tracks.find((t) => t.id === plan.to.trackId);
        return track?.depot === selectedDepot;
      }
      if (plan.from.trackId) {
        const track = tracks.find((t) => t.id === plan.from.trackId);
        return track?.depot === selectedDepot;
      }
      return false;
    });
  }, [movePlans, tracks, selectedDepot]);

  // Handle drag and drop
  const handleDrop = useCallback(
    (trainId: string, trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;

      // Check constraints
      if (track.state === 'gesperrt' || track.state === 'defekt') {
        alert(`Gleis ${track.name} ist ${track.state} und kann nicht belegt werden.`);
        return;
      }

      // Create new allocation
      const newAllocation: Allocation = {
        id: `alloc-new-${Date.now()}`,
        train_id: trainId,
        line_code: trainId.split('-')[0],
        trackId: trackId,
        startPlanned: new Date(),
        endPlanned: new Date(Date.now() + 4 * 60 * 60 * 1000),
        etaRelease: new Date(Date.now() + 5 * 60 * 60 * 1000),
        purpose: 'IS2',
        risk: 'low',
        status: 'maintenance',
        is_reserve: false,
        lengthM: 200,
        offsetM: 10,
        home_depot: track.depot,
      };

      setAllocations((prev) => [...prev, newAllocation]);

      // Log event
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DEPOT_ALLOCATION',
          timestamp: new Date().toISOString(),
          user: 'System',
          trainId: trainId,
          details: `Zug ${trainId} auf Gleis ${trackId} eingeplant`,
        }),
      }).catch(console.error);
    },
    [tracks]
  );

  // Export CSV
  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    const headers = [
      'Depot',
      'Gleis',
      'Zug-ID',
      'Linie',
      'IS-Stufe',
      'Start',
      'Ende',
      'ETA-Freigabe',
      'Status',
      'Reserve',
      'Risiko',
    ];

    const rows = filteredAllocations.map((a) => {
      const track = tracks.find((t) => t.id === a.trackId);
      return [
        selectedDepot,
        track?.name || a.trackId,
        a.train_id,
        a.line_code,
        a.purpose,
        a.startPlanned.toLocaleString('de-DE'),
        a.endPlanned.toLocaleString('de-DE'),
        a.etaRelease.toLocaleString('de-DE'),
        a.status,
        a.is_reserve ? 'Ja' : 'Nein',
        a.risk,
      ];
    });

    const csv = BOM + [headers, ...rows].map((row) => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `depot-map-${selectedDepot.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    // Log export
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'DEPOT_EXPORT',
        timestamp: new Date().toISOString(),
        user: 'System',
        trainId: null,
        details: `CSV-Export Depot-Map ${selectedDepot}: ${filteredAllocations.length} Belegungen`,
      }),
    }).catch(console.error);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header with KPIs */}
      <div className="bg-gradient-to-r from-orange-900 to-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Depot-Karte</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDepot('Essingen')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedDepot === 'Essingen'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Essingen
              </button>
              <button
                onClick={() => setSelectedDepot('Langweid')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedDepot === 'Langweid'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Langweid
              </button>
              {selectedDepot === 'Langweid' && (
                <button
                  onClick={() => setShowPhase2(!showPhase2)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    showPhase2
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Phase 2
                </button>
              )}
            </div>
          </div>

          {/* KPI Bar */}
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-400">Züge im Depot</div>
              <div className="text-xl font-bold text-white">
                {selectedDepot === 'Essingen'
                  ? kpis.trainsInDepot.essingen
                  : kpis.trainsInDepot.langweid}
                /{kpis.fleetSize}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Gleis-Auslastung jetzt</div>
              <div className="text-xl font-bold text-yellow-400">{kpis.utilizationPct}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">On-time Release heute</div>
              <div className="text-xl font-bold text-green-400">{kpis.onTimeReleasePct}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Konflikte offen</div>
              <div
                className={`text-xl font-bold ${conflicts.length > 0 ? 'text-red-400' : 'text-green-400'}`}
              >
                {conflicts.length}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Ø Standzeit</div>
              <div className="text-xl font-bold text-white">{kpis.avgStandingTimeHours}h</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Korr/Präv heute</div>
              <div className="text-xl font-bold text-white">
                {kpis.correctiveVsPreventive.corrective}/{kpis.correctiveVsPreventive.preventive}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-2">
            <button
              onClick={() => setMapView('streets')}
              className={`px-3 py-1 rounded ${
                mapView === 'streets' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              Straße
            </button>
            <button
              onClick={() => setMapView('satellite')}
              className={`px-3 py-1 rounded ${
                mapView === 'satellite' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              Satellit
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowConflicts(!showConflicts)}
              className={`px-4 py-1 rounded flex items-center gap-2 ${
                showConflicts ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <span>⚡</span>
              Konflikte ({conflicts.length})
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
            >
              CSV Export
            </button>
            <a
              href="/depot"
              className="px-4 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center gap-2"
            >
              Gantt öffnen
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Filters & Queue */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <DepotMapFilters filter={filter} onFilterChange={setFilter} allocations={allocations} />
          <div className="flex-1 overflow-y-auto">
            <DepotMapQueue movePlans={filteredMovePlans} onDrop={handleDrop} />
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <DepotMapGL
            depot={selectedDepot}
            tracks={filteredTracks}
            allocations={filteredAllocations}
            movePlans={filteredMovePlans}
            conflicts={conflicts}
            mapView={mapView}
            onTrackClick={setSelectedTrack}
            onAllocationClick={setSelectedAllocation}
            onDrop={handleDrop}
          />
        </div>

        {/* Right Panel - Inspector */}
        {(selectedTrack || selectedAllocation || showConflicts) && (
          <div className="w-96 bg-gray-800 border-l border-gray-700">
            <DepotMapInspector
              track={selectedTrack}
              allocation={selectedAllocation}
              allocations={filteredAllocations}
              conflicts={showConflicts ? conflicts : []}
              onClose={() => {
                setSelectedTrack(null);
                setSelectedAllocation(null);
                setShowConflicts(false);
              }}
              onConflictClick={(conflict: any) => {
                const allocation = allocations.find((a) => conflict.trainIds.includes(a.train_id));
                if (allocation) {
                  setSelectedAllocation(allocation);
                  setShowConflicts(false);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
