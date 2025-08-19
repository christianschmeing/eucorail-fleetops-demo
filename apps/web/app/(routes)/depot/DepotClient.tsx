'use client';

import { useState, useMemo } from 'react';
import GanttChart from './GanttChart';
import TrackList from './TrackList';
import ConflictPanel from './ConflictPanel';
import DepotInspector from './DepotInspector';

interface Track {
  id: string;
  name: string;
  depot: 'Essingen' | 'Langweid';
  length: number;
  features: string[];
  status: 'Frei' | 'Belegt' | 'Gesperrt';
}

interface Allocation {
  id: string;
  trackId: string;
  trainId: string;
  lineId: string;
  isLevel: 'IS1' | 'IS2' | 'IS3' | 'IS4';
  tasks: string[];
  startTime: string;
  endTime: string;
  etaRelease: string;
  status: 'Geplant' | 'Zugewiesen' | 'In Arbeit' | 'QA' | 'Freigegeben';
  team?: string;
  shift?: string;
  hasConflict?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
  isReserve?: boolean;
  homeDepot?: string;
}

interface Conflict {
  id: string;
  type: 'Doppelbelegung' | 'Feature-Mismatch' | 'Team-Überbuchung' | 'Kapazität';
  trackId: string;
  trainIds: string[];
  description: string;
  severity: 'low' | 'medium' | 'high';
  time: string;
}

interface KPIs {
  trainsInDepot: number;
  fleetSize: number;
  utilizationPct: number;
  onTimeReleasePct: number;
  conflictCount: number;
  avgStandingTimeHours: string;
  correctiveVsPreventive: { corrective: number; preventive: number };
}

interface DepotClientProps {
  initialTracks: Track[];
  initialAllocations: Allocation[];
  initialConflicts: Conflict[];
  initialKpis: KPIs;
}

export default function DepotClient({
  initialTracks,
  initialAllocations,
  initialConflicts,
  initialKpis
}: DepotClientProps) {
  const [selectedDepot, setSelectedDepot] = useState<'Essingen' | 'Langweid'>('Essingen');
  const [showPlannedTracks, setShowPlannedTracks] = useState(false);
  const [timeScale, setTimeScale] = useState<'today' | '3days' | '7days'>('today');
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);
  const [tracks] = useState(initialTracks);
  const [allocations] = useState(initialAllocations);
  const [conflicts] = useState(initialConflicts);
  const [kpis] = useState(initialKpis);

  // Filtere Daten nach Depot
  const filteredTracks = useMemo(() => {
    let filtered = tracks.filter(t => t.depot === selectedDepot);
    if (!showPlannedTracks) {
      filtered = filtered.filter(t => !t.name.includes('Planung'));
    }
    return filtered;
  }, [tracks, selectedDepot, showPlannedTracks]);

  const filteredAllocations = useMemo(() => 
    allocations.filter(a => filteredTracks.some(t => t.id === a.trackId)),
    [allocations, filteredTracks]
  );

  const filteredConflicts = useMemo(() =>
    conflicts.filter(c => filteredTracks.some(t => t.id === c.trackId)),
    [conflicts, filteredTracks]
  );

  // CSV Export mit Audit-Logging
  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['Depot', 'Gleis', 'Zug-ID', 'IS-Stufe', 'Aufgaben', 'Start', 'Ende', 'ETA-Freigabe', 'Status', 'Reserve', 'Team'];
    
    const rows = filteredAllocations.map(a => {
      const track = tracks.find(t => t.id === a.trackId);
      return [
        selectedDepot,
        track?.name || a.trackId,
        a.trainId,
        a.isLevel,
        a.tasks.join(', '),
        new Date(a.startTime).toLocaleString('de-DE', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        new Date(a.endTime).toLocaleString('de-DE', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        new Date(a.etaRelease).toLocaleString('de-DE', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        a.status,
        a.isReserve ? 'Ja' : 'Nein',
        a.team || '-'
      ];
    });
    
    // Log Export-Event
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'DEPOT_EXPORT',
        timestamp: new Date().toISOString(),
        user: 'System',
        trainId: null,
        details: `CSV-Export Depot ${selectedDepot}: ${filteredAllocations.length} Belegungen`
      })
    }).catch(console.error);
    
    const csv = BOM + [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `depot-planung-${selectedDepot.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-hidden bg-gray-900 flex flex-col">
      {/* Header mit KPIs */}
      <div className="bg-gradient-to-r from-orange-900 to-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Depot-Planung</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDepot('Essingen')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedDepot === 'Essingen' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Essingen (4 Gleise)
              </button>
              <button
                onClick={() => setSelectedDepot('Langweid')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedDepot === 'Langweid' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Langweid ({showPlannedTracks ? '14' : '11'} Gleise)
              </button>
            </div>
          </div>
          
          {/* KPI-Leiste */}
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-400">Züge im Depot</div>
              <div className="text-xl font-bold text-white">{kpis.trainsInDepot}/{kpis.fleetSize}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Gleis-Auslastung</div>
              <div className="text-xl font-bold text-yellow-400">{kpis.utilizationPct}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">On-Time heute</div>
              <div className="text-xl font-bold text-green-400">{kpis.onTimeReleasePct}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Konflikte</div>
              <div className={`text-xl font-bold ${kpis.conflictCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {kpis.conflictCount}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Ø Standzeit</div>
              <div className="text-xl font-bold text-white">{kpis.avgStandingTimeHours}h</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Korrektiv/Präventiv</div>
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
              onClick={() => setTimeScale('today')}
              className={`px-3 py-1 rounded ${
                timeScale === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              Heute
            </button>
            <button
              onClick={() => setTimeScale('3days')}
              className={`px-3 py-1 rounded ${
                timeScale === '3days' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              3 Tage
            </button>
            <button
              onClick={() => setTimeScale('7days')}
              className={`px-3 py-1 rounded ${
                timeScale === '7days' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              7 Tage
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowConflicts(!showConflicts)}
              className={`px-4 py-1 rounded flex items-center gap-2 ${
                showConflicts ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Konflikte ({filteredConflicts.length})
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV Export
            </button>
            {selectedDepot === 'Langweid' && (
              <button
                onClick={() => setShowPlannedTracks(!showPlannedTracks)}
                className={`px-4 py-1 rounded flex items-center gap-2 ${
                  showPlannedTracks ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Phase 2 Hallen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Gleisliste Links */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <TrackList 
            tracks={filteredTracks} 
            allocations={filteredAllocations}
            onTrackSelect={(trackId) => {
              const allocation = filteredAllocations.find(a => a.trackId === trackId);
              setSelectedAllocation(allocation || null);
            }}
          />
        </div>

        {/* Gantt Chart */}
        <div className="flex-1 overflow-auto">
          <GanttChart
            tracks={filteredTracks}
            allocations={filteredAllocations}
            timeScale={timeScale}
            onAllocationClick={setSelectedAllocation}
            selectedAllocation={selectedAllocation}
          />
        </div>

        {/* Inspector/Conflicts Panel */}
        {(selectedAllocation || showConflicts) && (
          <div className="w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            {showConflicts ? (
              <ConflictPanel 
                conflicts={filteredConflicts}
                allocations={filteredAllocations}
                tracks={filteredTracks}
                onConflictClick={(conflict) => {
                  // Find related allocation
                  const allocation = filteredAllocations.find(a => 
                    conflict.trainIds.includes(a.trainId)
                  );
                  if (allocation) {
                    setSelectedAllocation(allocation);
                    setShowConflicts(false);
                  }
                }}
              />
            ) : selectedAllocation ? (
              <DepotInspector
                allocation={selectedAllocation}
                track={tracks.find(t => t.id === selectedAllocation.trackId)}
                onClose={() => setSelectedAllocation(null)}
                onUpdate={(updated) => {
                  // In real app, this would update the allocation
                  console.log('Update allocation:', updated);
                }}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
