'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFleetStore } from '@/lib/state/fleet-store';
import Link from 'next/link';
import { MaintenanceInfo, MaintenanceInterval } from '@/types/train';
import { ECM_PROFILES } from '@/lib/maintenance/ecm-profiles';

interface Train {
  id: string;
  lineId: string;
  region: string;
  status: string;
  depot: string;
  series?: string;
  delayMin?: number;
  speedKmh?: number;
  healthScore?: number;
  nextMaintenanceDate?: string;
  maintenanceInfo?: MaintenanceInfo;
  [key: string]: any;
}

interface TrainsClientProps {
  initialTrains: Train[];
}

// Helper für Ampel-Status
function getStatusBadge(status: 'green' | 'yellow' | 'red') {
  if (status === 'green') return 'bg-green-500/20 text-green-400';
  if (status === 'yellow') return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
}

// Maintenance Badge Komponente
function MaintenanceBadge({ type, interval }: { type: string; interval?: MaintenanceInterval }) {
  if (!interval) return <span className="text-gray-500">-</span>;

  return (
    <div className="group relative">
      <div className={`px-2 py-1 rounded text-xs ${getStatusBadge(interval.status)} cursor-help`}>
        <div className="font-medium">{type}</div>
        <div className="text-[10px] opacity-90">
          Rest: {Math.round(interval.restKm).toLocaleString()} km
        </div>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-64">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <div className="text-xs text-white space-y-1">
            <div className="font-bold text-blue-400 mb-2">{type} Wartungsintervall</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-400">Seit letzter:</span>
                <div className="text-white">{interval.kmSinceLast.toLocaleString()} km</div>
                <div className="text-white">{interval.daysSinceLast} Tage</div>
              </div>
              <div>
                <span className="text-gray-400">Restlauf:</span>
                <div className="text-white">{interval.restKm.toLocaleString()} km</div>
                <div className="text-white">{interval.restDays} Tage</div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-[10px] text-gray-400">
                Intervall: {interval.intervalKm.toLocaleString()} km / {interval.intervalDays} Tage
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrainsClientExtended({ initialTrains }: TrainsClientProps) {
  const [trains] = useState<Train[]>(initialTrains);
  const activeTcms = useFleetStore((s) => s.activeTcms);
  const storeVehicles = useFleetStore((s) => s.vehicles as any[]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMaintenanceColumns, setShowMaintenanceColumns] = useState(true);
  const [maintenanceFilter, setMaintenanceFilter] = useState<string>('');
  const [restKmFilter, setRestKmFilter] = useState<number | null>(null);
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState({
    region: '',
    line: '',
    status: '',
    search: '',
  });

  const itemsPerPage = 20;

  // Build maintenance interval for a given train and stage using FleetStore due fields
  const getInterval = useMemo(() => {
    return (
      trainId: string,
      stage: 'IS1' | 'IS2' | 'IS3' | 'IS4' | 'Lathe'
    ): MaintenanceInterval | undefined => {
      const v = storeVehicles.find((x) => String(x.id) === String(trainId));
      if (!v) return undefined;
      const fam = String(v.type || '').toUpperCase();
      const prof: any = (ECM_PROFILES as any)[fam];
      // Lathe is not in IS config; approximate with IS2 like cadence if missing
      const stKey = stage === 'Lathe' ? 'IS2' : stage;
      const cfg = prof?.[stKey];
      if (!cfg) return undefined;
      const kmToNext = (v.kmToNext?.[stKey] ?? cfg.periodKm) as number;
      const daysToNext = (v.daysToNext?.[stKey] ?? cfg.periodDays) as number;
      const restKm = Math.max(0, kmToNext || 0);
      const restDays = Math.max(0, daysToNext || 0);
      const intervalKm = (cfg.periodKm as number) || 0;
      const intervalDays = (cfg.periodDays as number) || 0;
      const kmSinceLast = Math.max(0, intervalKm - restKm);
      const daysSinceLast = Math.max(0, intervalDays - restDays);
      const status: 'green' | 'yellow' | 'red' =
        restKm < 5000 ? 'red' : restKm < 10000 ? 'yellow' : 'green';
      const nextDate = new Date(Date.now() + restDays * 24 * 60 * 60 * 1000).toISOString();
      return {
        intervalKm,
        intervalDays,
        kmSinceLast,
        daysSinceLast,
        restKm,
        restDays,
        status,
        nextDate,
      } as MaintenanceInterval;
    };
  }, [storeVehicles]);

  // Attach minimal TCMS SSE on this page too (Map attaches its own when mounted)
  useEffect(() => {
    let es: EventSource | null = null;
    let poll: any = null;
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
      // Ensure list gets initial data
      poll = setInterval(async () => {
        try {
          const r = await fetch('/api/tcms/events', { cache: 'no-store' });
          const j = await r.json();
          if (Array.isArray(j.events)) {
            for (const e of j.events) useFleetStore.getState().addTcmsEvent(e);
          }
        } catch {}
      }, 15000);
    } catch {}
    return () => {
      try {
        es?.close();
      } catch {}
      try {
        if (poll) clearInterval(poll);
      } catch {}
    };
  }, []);

  // Aggregate TCMS counters for alerts panel
  const tcmsAggregate = useMemo(() => {
    const all: any[] = [];
    for (const [trainId, list] of Object.entries(activeTcms || {})) {
      for (const e of list as any[]) all.push({ ...e, trainId });
    }
    all.sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
    const critical = all.filter((e) => e.severity === 'CRITICAL').length;
    const alarm = all.filter((e) => e.severity === 'ALARM').length;
    const warn = all.filter((e) => e.severity === 'WARN').length;
    const recent = all.slice(-8).reverse();
    return { critical, alarm, warn, total: all.length, recent };
  }, [activeTcms]);

  // Sortierung
  const sortedTrains = [...trains].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    // Spezialbehandlung für Wartungsintervalle
    if (sortField.includes('restKm')) {
      const type = sortField.split('_')[0]; // IS1, IS2, etc.
      aVal = getInterval(a.id, type as any)?.restKm ?? Infinity;
      bVal = getInterval(b.id, type as any)?.restKm ?? Infinity;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter anwenden
  const filteredTrains = sortedTrains.filter((train) => {
    if (filters.region && train.region !== filters.region) return false;
    if (filters.line && train.lineId !== filters.line) return false;
    if (filters.status && train.status !== filters.status) return false;
    if (filters.search && !train.id.toLowerCase().includes(filters.search.toLowerCase()))
      return false;

    // Wartungsfilter
    if (maintenanceFilter) {
      const [type, statusFilter] = maintenanceFilter.split('_');
      const interval = train.maintenanceInfo?.[type as keyof MaintenanceInfo];
      if (!interval) return false;
      if (statusFilter === 'red' && interval.status !== 'red') return false;
      if (statusFilter === 'yellow' && interval.status !== 'yellow') return false;
    }

    // Rest-km Filter
    if (restKmFilter) {
      const hasLowRestKm = ['IS1', 'IS2', 'IS3', 'IS4', 'Lathe'].some((type) => {
        const interval = train.maintenanceInfo?.[type as keyof MaintenanceInfo];
        return interval && interval.restKm < restKmFilter;
      });
      if (!hasLowRestKm) return false;
    }

    return true;
  });

  // Paginierung
  const totalPages = Math.ceil(filteredTrains.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTrains = filteredTrains.slice(startIndex, endIndex);

  // CSV-Export
  const handleExport = () => {
    const csvData = [
      [
        'Zug-ID',
        'Linie',
        'Region',
        'Status',
        'Depot',
        'Serie',
        'Verspätung (min)',
        'Geschwindigkeit (km/h)',
        'Health Score',
        'IS1 Rest-km',
        'IS1 Rest-Tage',
        'IS1 Status',
        'IS2 Rest-km',
        'IS2 Rest-Tage',
        'IS2 Status',
        'IS3 Rest-km',
        'IS3 Rest-Tage',
        'IS3 Status',
        'IS4 Rest-km',
        'IS4 Rest-Tage',
        'IS4 Status',
        'Lathe Rest-km',
        'Lathe Rest-Tage',
        'Lathe Status',
      ],
      ...filteredTrains.map((train) => [
        train.id,
        train.lineId,
        train.region,
        train.status,
        train.depot,
        train.series || '',
        train.delayMin?.toString() || '0',
        train.speedKmh?.toString() || '0',
        train.healthScore?.toString() || '',
        train.maintenanceInfo?.IS1?.restKm?.toString() || '',
        train.maintenanceInfo?.IS1?.restDays?.toString() || '',
        train.maintenanceInfo?.IS1?.status || '',
        train.maintenanceInfo?.IS2?.restKm?.toString() || '',
        train.maintenanceInfo?.IS2?.restDays?.toString() || '',
        train.maintenanceInfo?.IS2?.status || '',
        train.maintenanceInfo?.IS3?.restKm?.toString() || '',
        train.maintenanceInfo?.IS3?.restDays?.toString() || '',
        train.maintenanceInfo?.IS3?.status || '',
        train.maintenanceInfo?.IS4?.restKm?.toString() || '',
        train.maintenanceInfo?.IS4?.restDays?.toString() || '',
        train.maintenanceInfo?.IS4?.status || '',
        train.maintenanceInfo?.Lathe?.restKm?.toString() || '',
        train.maintenanceInfo?.Lathe?.restDays?.toString() || '',
        train.maintenanceInfo?.Lathe?.status || '',
      ]),
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zuege-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Spalten-Toggle für Wartung
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-gray-800 p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Fahrzeugübersicht</h1>
            <p className="text-gray-300">
              <span className="font-semibold text-white">{trains.length} Fahrzeuge</span> •
              Wartungsintervalle & Restlaufzeiten
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowMaintenanceColumns(!showMaintenanceColumns)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                showMaintenanceColumns
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Wartungsdaten {showMaintenanceColumns ? 'ein' : 'aus'}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              CSV-Export ({filteredTrains.length} Zeilen)
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* TCMS Alerts Panel */}
        <div
          className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4"
          data-testid="tcms-alerts-panel"
          aria-label="TCMS-Alarmübersicht"
        >
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Aktive TCMS</div>
            <div className="text-2xl font-semibold text-white">{tcmsAggregate.total}</div>
            <div className="mt-3 flex gap-2">
              <span className="px-2 py-0.5 text-xs rounded bg-red-600/20 text-red-300 border border-red-600/40">
                Critical {tcmsAggregate.critical}
              </span>
              <span className="px-2 py-0.5 text-xs rounded bg-yellow-600/20 text-yellow-300 border border-yellow-600/40">
                Alarm {tcmsAggregate.alarm}
              </span>
              <span className="px-2 py-0.5 text-xs rounded bg-green-600/20 text-green-300 border border-green-600/40">
                Warn {tcmsAggregate.warn}
              </span>
            </div>
          </div>
          <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300 font-semibold">Neueste TCMS-Ereignisse</div>
              <div className="text-xs text-gray-400">{new Date().toLocaleString()}</div>
            </div>
            <div className="mt-3 divide-y divide-gray-700">
              {tcmsAggregate.recent.length === 0 && (
                <div className="text-xs text-gray-500">Keine aktiven Ereignisse</div>
              )}
              {tcmsAggregate.recent.map((e) => (
                <div key={e.id} className="py-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        e.severity === 'CRITICAL'
                          ? 'bg-red-500'
                          : e.severity === 'ALARM'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                    />
                    <span className="text-gray-300">{e.code}</span>
                    <span className="text-gray-500 hidden sm:inline">· {e.system}</span>
                    <Link
                      href={`/trains/${encodeURIComponent(e.trainId)}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {e.trainId}
                    </Link>
                  </div>
                  <div className="text-xs text-gray-500">{new Date(e.ts).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Suche</label>
              <input
                type="text"
                placeholder="Zug-ID..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Region</label>
              <select
                value={filters.region}
                onChange={(e) => {
                  setFilters({ ...filters, region: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Alle</option>
                <option value="BW">Baden-Württemberg</option>
                <option value="BY">Bayern</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Alle</option>
                <option value="active">Aktiv</option>
                <option value="maintenance">Wartung</option>
                <option value="inspection">Inspektion</option>
                <option value="standby">Bereitschaft</option>
                <option value="reserve">Reserve</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Wartungsampel</label>
              <select
                value={maintenanceFilter}
                onChange={(e) => {
                  setMaintenanceFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Alle</option>
                <option value="IS1_red">IS1 Rot</option>
                <option value="IS2_red">IS2 Rot</option>
                <option value="IS3_red">IS3 Rot</option>
                <option value="IS4_red">IS4 Rot</option>
                <option value="Lathe_red">Lathe Rot</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Rest-km unter</label>
              <select
                value={restKmFilter || ''}
                onChange={(e) => {
                  setRestKmFilter(e.target.value ? parseInt(e.target.value) : null);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Alle</option>
                <option value="1000">1.000 km</option>
                <option value="5000">5.000 km</option>
                <option value="10000">10.000 km</option>
                <option value="20000">20.000 km</option>
              </select>
            </div>
          </div>

          {(filters.region ||
            filters.line ||
            filters.status ||
            filters.search ||
            maintenanceFilter ||
            restKmFilter) && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {filteredTrains.length} von {trains.length} Zügen gefiltert
              </span>
              <button
                onClick={() => {
                  setFilters({ region: '', line: '', status: '', search: '' });
                  setMaintenanceFilter('');
                  setRestKmFilter(null);
                  setCurrentPage(1);
                }}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Filter zurücksetzen
              </button>
            </div>
          )}
        </div>

        {/* Tabelle */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50 border-b border-gray-600">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                    onClick={() => handleSort('id')}
                  >
                    Zug-ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Linie</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                    Health
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">TCMS</th>

                  {showMaintenanceColumns && (
                    <>
                      <th
                        className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => handleSort('IS1_restKm')}
                      >
                        IS1 {sortField === 'IS1_restKm' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => handleSort('IS2_restKm')}
                      >
                        IS2 {sortField === 'IS2_restKm' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => handleSort('IS3_restKm')}
                      >
                        IS3 {sortField === 'IS3_restKm' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => handleSort('IS4_restKm')}
                      >
                        IS4 {sortField === 'IS4_restKm' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => handleSort('Lathe_restKm')}
                      >
                        Lathe{' '}
                        {sortField === 'Lathe_restKm' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {currentTrains.map((train) => {
                  const evts = (activeTcms as any)[train.id] || [];
                  const alarms = evts.filter(
                    (e: any) => e.severity === 'ALARM' || e.severity === 'CRITICAL'
                  );
                  const warn = evts.filter((e: any) => e.severity === 'WARN').length;
                  const hasCritical = evts.some((e: any) => e.severity === 'CRITICAL');
                  return (
                    <tr
                      key={train.id}
                      className={`transition-colors ${hasCritical ? 'bg-red-900/20' : 'hover:bg-gray-700/30'}`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/trains/${encodeURIComponent(train.id)}`}
                          className="font-medium text-blue-400 hover:text-blue-300"
                        >
                          {train.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{train.lineId}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            train.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : train.status === 'maintenance'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : train.status === 'inspection'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {train.status === 'active'
                            ? 'Aktiv'
                            : train.status === 'maintenance'
                              ? 'Wartung'
                              : train.status === 'inspection'
                                ? 'Inspektion'
                                : train.status === 'standby'
                                  ? 'Bereitschaft'
                                  : train.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {train.healthScore && (
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-12 bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  train.healthScore >= 90
                                    ? 'bg-green-500'
                                    : train.healthScore >= 75
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                }`}
                                style={{ width: `${train.healthScore}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">{train.healthScore}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded border ${alarms.length > 0 ? 'bg-red-600/20 text-red-300 border-red-600/40' : warn > 0 ? 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40' : 'bg-green-600/20 text-green-300 border-green-600/40'}`}
                        >
                          {alarms.length > 0
                            ? `${alarms.length} Alarm`
                            : warn > 0
                              ? `${warn} Warn`
                              : '0'}
                        </span>
                      </td>

                      {showMaintenanceColumns && (
                        <>
                          <td className="px-4 py-3 text-center">
                            <MaintenanceBadge type="IS1" interval={getInterval(train.id, 'IS1')} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MaintenanceBadge type="IS2" interval={getInterval(train.id, 'IS2')} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MaintenanceBadge type="IS3" interval={getInterval(train.id, 'IS3')} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MaintenanceBadge type="IS4" interval={getInterval(train.id, 'IS4')} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MaintenanceBadge
                              type="Lathe"
                              interval={getInterval(train.id, 'Lathe')}
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Zeige {startIndex + 1}-{Math.min(endIndex, filteredTrains.length)} von{' '}
                {filteredTrains.length} Einträgen
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zurück
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm rounded ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
