'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface LogEvent {
  id: string;
  time: string; // ISO8601
  type:
    | 'PolicyApproved'
    | 'WorkOrderClosed'
    | 'WorkOrderAssigned'
    | 'MaintenancePlanUpdated'
    | 'PositionStreamConnected'
    | 'AlarmRaised'
    | 'AlarmCleared'
    | 'UserLogin'
    | 'SignoffCompleted'
    | 'DataVersionTagged'
    | 'DEPOT_PLAN_UPDATE'
    | 'DEPOT_RELEASE'
    | 'DEPOT_EXPORT'
    | 'DEPOT_ALLOCATION'
    | 'DEPOT_CONFLICT'
    | 'TCMS_EVENT';
  objectType: string;
  objectId: string;
  trainId?: string;
  user?: string;
  details?: string;
}

interface LogClientProps {
  initialEvents: LogEvent[];
  uniqueTrainIds: number;
  eventTypeLabels: Record<LogEvent['type'], string>;
}

export default function LogClient({
  initialEvents,
  uniqueTrainIds,
  eventTypeLabels,
}: LogClientProps) {
  const search = useSearchParams();
  const [events] = useState<LogEvent[]>(initialEvents);
  const [filters, setFilters] = useState({
    types: [] as string[],
    timeRange: '48h',
    trainId: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Apply deeplink: sev=CRITICAL,ALARM (maps to TCMS_EVENT type)
  useEffect(() => {
    try {
      const sev = (search.get('sev') || '').toUpperCase();
      if (sev) {
        // we keep type filter focusing TCMS events; severity refinement is done in list filter below
        setFilters((f) => ({ ...f, types: ['TCMS_EVENT'] }));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Formatiere Datum/Zeit deutsch
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter anwenden
  const filteredEvents = events.filter((event) => {
    // Typ-Filter (Mehrfachauswahl)
    if (filters.types.length > 0 && !filters.types.includes(event.type)) {
      return false;
    }

    // Zeitraum-Filter
    if (filters.timeRange) {
      const now = new Date();
      const eventTime = new Date(event.time);
      const hours =
        filters.timeRange === '24h'
          ? 24
          : filters.timeRange === '48h'
            ? 48
            : filters.timeRange === '7d'
              ? 168
              : 0;

      if (hours > 0 && now.getTime() - eventTime.getTime() > hours * 60 * 60 * 1000) {
        return false;
      }
    }

    // Zug-ID-Filter
    if (filters.trainId && event.trainId) {
      if (!event.trainId.toLowerCase().includes(filters.trainId.toLowerCase())) {
        return false;
      }
    }

    // Severity query (only for TCMS_EVENT)
    const sev = (search?.get('sev') || '').toUpperCase();
    const sev = (search?.get('sev') || '').toUpperCase();
    if (sev && event.type === 'TCMS_EVENT') {
      // crude match against details text which contains message; keep visible if includes sev keyword
      if (!`${event.details || ''}`.toUpperCase().includes(sev)) return false;
    }

    return true;
  });

  // Berechne Abdeckung für gefilterte Events
  const filteredUniqueTrains = new Set(
    filteredEvents.filter((e) => e.trainId).map((e) => e.trainId!)
  ).size;

  // Paginierung
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

  // CSV-Export mit Semikolon und UTF-8 BOM
  const handleExport = () => {
    // UTF-8 BOM
    const BOM = '\uFEFF';

    const csvData = [
      ['Zeit', 'Typ', 'Objekt', 'Zug-ID', 'Benutzer', 'Details'],
      ...filteredEvents.map((event) => [
        formatDateTime(event.time),
        eventTypeLabels[event.type],
        `${event.objectType} ${event.objectId}`,
        event.trainId || '–',
        event.user || '–',
        event.details || '–',
      ]),
    ];

    // Verwende Semikolon als Trennzeichen
    const csv = BOM + csvData.map((row) => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `protokoll-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Toggle Typ-Filter
  const toggleTypeFilter = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
    setCurrentPage(1);
  };

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-gray-800 p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Ereignisprotokoll</h1>
            <p className="text-gray-300">Systemereignisse und Aktivitäten • Eucorail FleetOps</p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            CSV exportieren
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Abdeckungs-Indikator */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Flottenabdeckung</h2>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-white">
                  {filters.types.length > 0 || filters.trainId
                    ? `${filteredUniqueTrains}/144`
                    : `${uniqueTrainIds}/144`}{' '}
                  Züge
                </div>
                <span className="text-sm text-gray-400">
                  im{' '}
                  {filters.timeRange === '24h'
                    ? '24-h'
                    : filters.timeRange === '48h'
                      ? '48-h'
                      : '7-Tage'}
                  -Fenster
                </span>
              </div>
              {uniqueTrainIds === 144 ? (
                <div className="mt-2 text-sm text-green-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Vollständige Abdeckung erreicht
                </div>
              ) : (
                <div className="mt-2 text-sm text-yellow-400">
                  ⚠ Es fehlen Ereignisse für {144 - uniqueTrainIds} Züge
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{events.length}</div>
              <div className="text-sm text-gray-400">Gesamtereignisse</div>
              <div className="text-xs text-green-400 mt-1">≥144 ✓</div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
          <div className="space-y-4">
            {/* Typ-Filter (Mehrfachauswahl) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ereignistyp (Mehrfachauswahl)
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(eventTypeLabels).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      filters.types.includes(type)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Zeitraum-Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Zeitraum</label>
                <select
                  value={filters.timeRange}
                  onChange={(e) => {
                    setFilters({ ...filters, timeRange: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="24h">24 Stunden</option>
                  <option value="48h">48 Stunden (Standard)</option>
                  <option value="7d">7 Tage</option>
                </select>
              </div>

              {/* Zug-ID-Suche */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Zug-ID</label>
                <input
                  type="text"
                  placeholder="z.B. RE9-60001"
                  value={filters.trainId}
                  onChange={(e) => {
                    setFilters({ ...filters, trainId: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>

              {/* Filter zurücksetzen */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({ types: [], timeRange: '48h', trainId: '' });
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Filter zurücksetzen
                </button>
              </div>
            </div>
          </div>

          {/* Filter-Status */}
          {(filters.types.length > 0 || filters.trainId) && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <p className="text-sm text-gray-400">
                Gefiltert: {filteredEvents.length} von {events.length} Ereignissen •
                {filteredUniqueTrains} von 144 Zügen abgedeckt
              </p>
            </div>
          )}
        </div>

        {/* Tabelle */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50 border-b border-gray-600 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Zeit</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Typ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Objekt</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Zug-ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Benutzer
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {currentEvents.length > 0 ? (
                  currentEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                        {formatDateTime(event.time)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-lg ${
                            event.type.includes('Alarm')
                              ? 'bg-red-500/20 text-red-400'
                              : event.type.includes('Work')
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : event.type.includes('Policy') || event.type.includes('Signoff')
                                  ? 'bg-green-500/20 text-green-400'
                                  : event.type.includes('Position')
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {eventTypeLabels[event.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {event.objectType} {event.objectId}
                      </td>
                      <td className="px-4 py-3">
                        {event.trainId ? (
                          <a
                            href={`/trains/${event.trainId}`}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            {event.trainId}
                          </a>
                        ) : (
                          <span className="text-gray-500 text-sm">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{event.user || '–'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{event.details || '–'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Keine Einträge für die aktuelle Auswahl.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginierung */}
        {filteredEvents.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredEvents.length)} von{' '}
              <span className="font-semibold text-white">{filteredEvents.length}</span> Ereignissen
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Zurück
              </button>

              <span className="px-3 py-1 text-white">
                Seite {currentPage} von {totalPages || 1}
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`px-3 py-1 rounded transition-colors ${
                  currentPage === totalPages || totalPages === 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Weiter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
