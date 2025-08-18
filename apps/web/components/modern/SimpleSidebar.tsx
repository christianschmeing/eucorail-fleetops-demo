'use client';

import { useState, useEffect } from 'react';
import { Search, Train, Activity, AlertCircle, Wrench } from 'lucide-react';

interface SimpleSidebarProps {
  trains: any[];
  selectedTrain: string | null;
  onSelect: (id: string) => void;
}

export function SimpleSidebar({ trains = [], selectedTrain, onSelect }: SimpleSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lineFilter, setLineFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  // Filter trains
  const filteredTrains = trains.filter((train) => {
    const matchesSearch =
      !searchQuery ||
      train.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      train.lineId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || train.status === statusFilter;
    const matchesLine = lineFilter === 'all' || train.lineId === lineFilter;

    const regionByLine: Record<string, 'BY' | 'BW'> = { RE9: 'BY', RE8: 'BW', MEX16: 'BW' };
    const region = regionByLine[String(train.lineId || '').toUpperCase()] || 'BY';
    const matchesRegion = regionFilter === 'all' || region === regionFilter;

    return matchesSearch && matchesStatus && matchesLine && matchesRegion;
  });

  // Get unique lines from trains
  const uniqueLines = Array.from(new Set(trains.map((t) => t.lineId).filter(Boolean)));

  // Count trains by status
  const statusCounts = {
    active: trains.filter((t) => t.status === 'active').length,
    standby: trains.filter((t) => t.status === 'standby').length,
    maintenance: trains.filter((t) => t.status === 'maintenance').length,
  };

  return (
    <aside
      className="w-96 bg-gray-900/95 backdrop-blur-sm border-r border-gray-700 h-full flex flex-col"
      data-testid="sidebar"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-700 sticky top-0 bg-gray-900/95 z-10">
        <h2 className="text-xl font-bold text-white mb-1">Zugübersicht</h2>
        <p className="text-gray-400 text-sm">{trains.length} Züge im System</p>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suchen… (ID, Linie)"
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-700 space-y-3 sticky top-[72px] bg-gray-900/95 z-10">
        {/* Status Filter Buttons (for tests: role group) */}
        <div role="group" aria-label="Status" className="flex items-center gap-2 flex-wrap">
          {['active', 'standby', 'maintenance'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter((prev) => (prev === s ? 'all' : s))}
              className={`px-3 py-1 rounded border text-xs ${
                statusFilter === s
                  ? 'bg-blue-900/50 border-blue-700 text-blue-300'
                  : 'bg-gray-800 border-gray-700 text-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Region Filter Buttons (for tests: role group) */}
        <div role="group" aria-label="Region" className="flex items-center gap-2">
          {['BY', 'BW'].map((r) => (
            <button
              key={r}
              onClick={() => setRegionFilter((prev) => (prev === r ? 'all' : r))}
              className={`px-3 py-1 rounded border text-xs ${
                regionFilter === r
                  ? 'bg-purple-900/50 border-purple-700 text-purple-300'
                  : 'bg-gray-800 border-gray-700 text-gray-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Line Filter Select remains for usability */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Linie</label>
          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Alle Linien</option>
            {uniqueLines.map((line) => (
              <option key={line} value={line}>
                {line} ({trains.filter((t) => t.lineId === line).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Train List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-sm text-gray-400 mb-2">{filteredTrains.length} Züge gefunden</div>

        <div className="space-y-2">
          {filteredTrains.map((train) => (
            <div
              key={train.id}
              onClick={() => onSelect(train.id)}
              data-testid="train-item"
              className={`p-4 bg-gray-800 rounded-lg cursor-pointer transition-all hover:bg-gray-700 border border-gray-700 hover:border-gray-600 ${
                selectedTrain === train.id ? 'ring-2 ring-blue-500 bg-gray-700' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Train ID */}
                  <h4 className="text-white font-semibold text-base mb-1">{train.id}</h4>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        train.status === 'active'
                          ? 'bg-green-900/50 text-green-400 border border-green-800'
                          : train.status === 'standby'
                            ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                            : 'bg-red-900/50 text-red-400 border border-red-800'
                      }`}
                    >
                      {train.status === 'active' && <Activity className="w-3 h-3" />}
                      {train.status === 'standby' && <AlertCircle className="w-3 h-3" />}
                      {train.status === 'maintenance' && <Wrench className="w-3 h-3" />}
                      {train.status}
                    </span>

                    {train.lineId && (
                      <span className="text-xs text-gray-400">Linie: {train.lineId}</span>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="text-xs text-gray-500 space-y-1">
                    {train.depot && (
                      <p>
                        Depot: <span className="text-gray-400">{train.depot}</span>
                      </p>
                    )}
                    {train.speed !== undefined && train.speed > 0 && (
                      <p>
                        Geschwindigkeit: <span className="text-blue-400">{train.speed} km/h</span>
                      </p>
                    )}
                    {train.nextStop && (
                      <p>
                        Nächster Halt: <span className="text-gray-400">{train.nextStop}</span>
                      </p>
                    )}
                  </div>
                </div>

                <Train className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          ))}
        </div>

        {filteredTrains.length === 0 && (
          <div className="text-center py-8 text-gray-500">Keine Züge gefunden</div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-green-400">{statusCounts.active}</p>
            <p className="text-xs text-gray-500">Aktiv</p>
          </div>
          <div>
            <p className="text-lg font-bold text-yellow-400">{statusCounts.standby}</p>
            <p className="text-xs text-gray-500">Standby</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-400">{statusCounts.maintenance}</p>
            <p className="text-xs text-gray-500">Wartung</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
