'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Train, Activity, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import Link from 'next/link';

interface KPIData {
  availabilityPct: number;
  overdueCount: number;
  woAgingMedianDays: number;
  depotUtilToday: Record<string, number>;
  fleetSize: number;
  mtbf?: number;
  mttr?: number;
  ecmCompliance?: number;
  vehicleTypes?: Record<string, number>;
  lineDistribution?: Record<string, number>;
}

interface DashboardClientProps {
  kpiData: KPIData;
  recentEvents: any[];
  trains: any[];
  lines: any[];
  maintenanceSummary: {
    stages: Record<
      'IS1' | 'IS2' | 'IS3' | 'IS4' | 'IS5' | 'IS6',
      { critical: number; warn: number; ok: number }
    >;
    top10: Array<{
      id: string;
      stage: string;
      kmToNext: number;
      daysToNext: number;
      depot: string;
    }>;
  };
  depotSummary: Record<
    string,
    { tracksTotal: number; inUse: number; plannedNext7d: number; conflicts: number }
  >;
  tcmsSummary: {
    countsBySeverity: Record<string, number>;
    topTrains: Array<{ trainId: string; score: number }>;
    recent: any[];
  };
}

const VEHICLE_TYPE_INFO = {
  flirt_3_160: { name: 'Stadler FLIRT', color: 'blue', count: 59 },
  mireo_3_plus_h: { name: 'Siemens Mireo H2', color: 'green', count: 49 },
  desiro_hc: { name: 'Siemens Desiro HC', color: 'purple', count: 36 },
};

export default function DashboardClient({
  kpiData,
  recentEvents,
  trains,
  lines,
  maintenanceSummary,
  depotSummary,
  tcmsSummary,
}: DashboardClientProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [tcmsSseStatus, setTcmsSseStatus] = useState<'live' | 'down'>('live');

  // 30s polling for summaries (overrides SSR props when available)
  const maintenanceQ = useQuery({
    queryKey: ['maintenance-summary'],
    queryFn: async () => (await fetch('/api/maintenance/summary', { cache: 'no-store' })).json(),
    refetchInterval: 30000,
    staleTime: 30000,
  });
  const depotQ = useQuery({
    queryKey: ['depot-summary'],
    queryFn: async () => (await fetch('/api/depot/summary', { cache: 'no-store' })).json(),
    refetchInterval: 30000,
    staleTime: 30000,
  });
  const tcmsQ = useQuery({
    queryKey: ['tcms-summary'],
    queryFn: async () => (await fetch('/api/tcms/summary', { cache: 'no-store' })).json(),
    refetchInterval: 30000,
    staleTime: 30000,
  });

  const ms: any = maintenanceQ.data ?? maintenanceSummary;
  const ds: any = depotQ.data ?? depotSummary;
  const ts: any = tcmsQ.data ?? tcmsSummary;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // TCMS SSE health: show badge when stream is down
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/tcms/stream');
      es.onopen = () => setTcmsSseStatus('live');
      es.onerror = () => {
        setTcmsSseStatus('down');
        if (es) es.close();
      };
      void 0; // presence check only
    } catch {
      setTcmsSseStatus('down');
    }
    return () => {
      if (es) es.close();
    };
  }, []);

  // Berechne Live-Statistiken
  const activeTrains = trains.filter((t) => t.status === 'active').length;
  const maintenanceTrains = trains.filter((t) => t.status === 'maintenance').length;
  const reserveTrains = trains.filter((t) => t.isReserve).length;
  const criticalAlerts = trains.filter((t) => t.status === 'alarm').length;

  // Linien-Gruppierung
  const lineGroups = {
    RE: lines.filter((l) => l.code?.startsWith('RE')).length,
    MEX: lines.filter((l) => l.code?.startsWith('MEX')).length,
    RB: lines.filter((l) => l.code?.startsWith('RB')).length,
    S: lines.filter((l) => l.code?.startsWith('S')).length,
  };

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Header mit Live-Zeit */}
      <div className="bg-gradient-to-r from-blue-900 to-gray-800 p-6 border-b border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">FleetOps Dashboard</h1>
            <p className="text-gray-300">
              Eucorail Flottenmanagement • {kpiData.fleetSize} Fahrzeuge • {lines.length} Linien
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-white">
              {currentTime.toLocaleTimeString('de-DE')}
            </div>
            <div className="text-sm text-gray-400">
              {currentTime.toLocaleDateString('de-DE', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Haupt-KPI-Karten */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Verfügbarkeit */}
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all cursor-pointer"
            onClick={() => setSelectedMetric('availability')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-900/50 rounded-lg">
                <Train className="h-6 w-6 text-blue-400" />
              </div>
              <span
                className={`text-2xl font-bold ${kpiData.availabilityPct >= 90 ? 'text-green-400' : kpiData.availabilityPct >= 80 ? 'text-yellow-400' : 'text-red-400'}`}
              >
                {kpiData.availabilityPct}%
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-400">Verfügbarkeit</h3>
            <p className="text-2xl font-bold text-white mt-1">
              {activeTrains}/{kpiData.fleetSize}
            </p>
            <p className="text-xs text-gray-500 mt-2">Aktive Fahrzeuge</p>
          </div>

          {/* Wartung */}
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-yellow-500 transition-all cursor-pointer"
            onClick={() => setSelectedMetric('maintenance')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-900/50 rounded-lg">
                <Wrench className="h-6 w-6 text-yellow-400" />
              </div>
              <span
                className={`text-2xl font-bold ${maintenanceTrains <= 20 ? 'text-green-400' : maintenanceTrains <= 30 ? 'text-yellow-400' : 'text-red-400'}`}
              >
                {maintenanceTrains}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-400">In Wartung</h3>
            <p className="text-2xl font-bold text-white mt-1">{kpiData.overdueCount}</p>
            <p className="text-xs text-gray-500 mt-2">Überfällige WOs</p>
          </div>

          {/* ECM Compliance */}
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-green-500 transition-all cursor-pointer"
            onClick={() => setSelectedMetric('compliance')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-900/50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <span className="text-2xl font-bold text-green-400">
                {kpiData.ecmCompliance || 92.3}%
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-400">ECM Compliance</h3>
            <p className="text-2xl font-bold text-white mt-1">ECM-3</p>
            <p className="text-xs text-gray-500 mt-2">Zertifizierungsstatus</p>
          </div>

          {/* Alarme */}
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-red-500 transition-all cursor-pointer"
            onClick={() => setSelectedMetric('alerts')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-900/50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <span
                className={`text-2xl font-bold ${criticalAlerts === 0 ? 'text-green-400' : criticalAlerts <= 3 ? 'text-yellow-400' : 'text-red-400'}`}
              >
                {criticalAlerts}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-400">Kritische Alarme</h3>
            <p className="text-2xl font-bold text-white mt-1">{reserveTrains}</p>
            <p className="text-xs text-gray-500 mt-2">Reserve-Fahrzeuge</p>
          </div>
        </div>

        {/* IS-Fälligkeiten Ampel + Top 10 fällig */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">IS‑Fälligkeiten</h2>
              <a href="/maintenance" className="text-blue-400 text-sm hover:text-blue-300">
                Details →
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['IS1', 'IS2', 'IS3', 'IS4', 'IS5', 'IS6'] as const).map((st) => {
                const c = ms.stages[st];
                const total = c.critical + c.warn + c.ok || 1;
                return (
                  <a
                    key={st}
                    href={`/maintenance?stage=${st}`}
                    className="p-3 rounded-lg border border-gray-700 hover:border-blue-600 transition-colors"
                  >
                    <div className="text-sm text-gray-400">{st}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-300">
                        {c.critical}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-yellow-600/20 text-yellow-300">
                        {c.warn}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-green-600/20 text-green-300">
                        {c.ok}
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${(c.critical / total) * 100}%` }}
                      />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Top 10 fällig</h2>
              <div className="text-xs text-gray-400">Sortiert nach Rest‑Tage, dann km</div>
            </div>
            <div className="divide-y divide-gray-700">
              {ms.top10.map((row: any) => (
                <div
                  key={`${row.id}-${row.stage}`}
                  className="py-2 flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <a
                      href={`/trains/${encodeURIComponent(row.id)}`}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      {row.id}
                    </a>
                    <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-200">
                      {row.stage}
                    </span>
                    <span className="text-gray-400">{row.depot}</span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-300">
                    <span>{row.daysToNext} Tage</span>
                    <span>{row.kmToNext.toLocaleString()} km</span>
                    <a
                      href={`/maintenance?stage=${row.stage}&focus=${encodeURIComponent(row.id)}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Planen →
                    </a>
                  </div>
                </div>
              ))}
              {ms.top10.length === 0 && (
                <div className="text-xs text-gray-500">Keine Daten verfügbar</div>
              )}
            </div>
          </div>
        </div>

        {/* Fahrzeugtyp-Verteilung */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Fahrzeugflotte nach Typ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(VEHICLE_TYPE_INFO).map(([key, info]) => (
              <div
                key={key}
                className={`bg-${info.color}-900/20 border border-${info.color}-800/50 rounded-lg p-4`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`text-${info.color}-400 font-semibold`}>{info.name}</h3>
                  <span className="text-2xl font-bold text-white">{info.count}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Aktiv:</span>
                    <span className="text-gray-300">
                      {trains.filter((t) => t.vehicleType === key && t.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wartung:</span>
                    <span className="text-gray-300">
                      {
                        trains.filter((t) => t.vehicleType === key && t.status === 'maintenance')
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reserve:</span>
                    <span className="text-gray-300">
                      {trains.filter((t) => t.vehicleType === key && t.isReserve).length}
                    </span>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-${info.color}-500`}
                    style={{
                      width: `${(trains.filter((t) => t.vehicleType === key && t.status === 'active').length / info.count) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Linien-Übersicht und Depot-Auslastung */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Linien-Gruppierung */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Liniennetz</h2>
            <div className="space-y-3">
              {Object.entries(lineGroups).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                        type === 'RE'
                          ? 'bg-blue-600'
                          : type === 'MEX'
                            ? 'bg-red-600'
                            : type === 'RB'
                              ? 'bg-gray-600'
                              : 'bg-green-600'
                      }`}
                    >
                      {type}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-300">
                        {type === 'RE'
                          ? 'Regional-Express'
                          : type === 'MEX'
                            ? 'Metropol-Express'
                            : type === 'RB'
                              ? 'Regionalbahn'
                              : 'S-Bahn'}
                      </div>
                      <div className="text-xs text-gray-500">{count} Linien</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">
                      {trains.filter((t) => t.lineCode?.startsWith(type)).length}
                    </div>
                    <div className="text-xs text-gray-500">Fahrzeuge</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Depot-Auslastung */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Depot-Auslastung</h2>
            <div className="space-y-4">
              {['Essingen', 'Langweid'].map((depot) => {
                const s = ds[depot] || {
                  tracksTotal: 0,
                  inUse: 0,
                  plannedNext7d: 0,
                  conflicts: 0,
                };
                const utilization = Math.round((s.inUse / Math.max(1, s.tracksTotal)) * 100);
                const trainsInDepot = trains.filter(
                  (t) =>
                    t.homeDepot === depot &&
                    (t.status === 'maintenance' ||
                      t.status === 'abstellung' ||
                      t.status === 'standby')
                ).length;

                return (
                  <div key={depot}>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-300">{depot}</h3>
                        <p className="text-xs text-gray-500">
                          {depot === 'Essingen' ? 'Baden-Württemberg' : 'Bayern'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">{trainsInDepot}</div>
                        <div className="text-xs text-gray-500">Fahrzeuge</div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          utilization > 80
                            ? 'bg-red-500'
                            : utilization > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{utilization}% ausgelastet</span>
                      <span>
                        {s.tracksTotal} Gleise · {s.plannedNext7d} geplant · {s.conflicts} Konflikte
                      </span>
                    </div>
                    <div className="mt-2 flex gap-3 text-xs">
                      <a href="/depot/planning" className="text-blue-400 hover:text-blue-300">
                        Planung
                      </a>
                      <a
                        href={`/depot/map?depot=${encodeURIComponent(depot)}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Karte
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MTBF/MTTR Metriken */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Zuverlässigkeitsmetriken</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-white">{kpiData.mtbf || 428}h</div>
                  <div className="text-xs text-gray-500">MTBF (Mean Time Between Failures)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{kpiData.mttr || 2.4}h</div>
                  <div className="text-xs text-gray-500">MTTR (Mean Time To Repair)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TCMS Snapshot + Live-Events */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">TCMS Alarme (24h)</h2>
              <div className="flex items-center gap-2">
                {tcmsSseStatus === 'down' && (
                  <span
                    data-testid="tcms-sse-fallback"
                    className="px-2 py-0.5 rounded text-xs bg-yellow-900/40 text-yellow-300 border border-yellow-700"
                  >
                    Live-Stream unterbrochen – Polling aktiv
                  </span>
                )}
                <a href="/log" className="text-blue-400 text-sm hover:text-blue-300">
                  Protokoll →
                </a>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              {['CRITICAL', 'ALARM', 'WARN', 'INFO'].map((sev) => (
                <a
                  key={sev}
                  href={`/log?sev=${sev}`}
                  className={`px-2 py-0.5 rounded border ${sev === 'CRITICAL' ? 'bg-red-600/20 text-red-300 border-red-600/40' : sev === 'ALARM' ? 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40' : sev === 'WARN' ? 'bg-green-600/20 text-green-300 border-green-600/40' : 'bg-gray-600/20 text-gray-300 border-gray-600/40'}`}
                >
                  {sev} {ts.countsBySeverity[sev] || 0}
                </a>
              ))}
            </div>
            <div className="mt-3 divide-y divide-gray-700">
              {ts.recent.slice(0, 8).map((e: any) => (
                <div key={e.id} className="py-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${e.severity === 'CRITICAL' ? 'bg-red-500' : e.severity === 'ALARM' ? 'bg-yellow-500' : 'bg-green-500'}`}
                    />
                    <span className="text-gray-300">{e.code || e.system}</span>
                    <a
                      href={`/trains/${encodeURIComponent(e.trainId)}#alerts`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {e.trainId}
                    </a>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(e.ts).toLocaleTimeString('de-DE')}
                  </div>
                </div>
              ))}
              {ts.recent.length === 0 && (
                <div className="text-xs text-gray-500">Keine Daten verfügbar</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-6">
            {/* Live-Events (bestehend) */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Live-Ereignisse</h2>
              <a href="/log" className="text-blue-400 hover:text-blue-300 text-sm">
                Alle anzeigen →
              </a>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentEvents.slice(0, 10).map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      event.type === 'maintenance_started'
                        ? 'bg-yellow-400'
                        : event.type === 'maintenance_completed'
                          ? 'bg-green-400'
                          : event.type === 'alert'
                            ? 'bg-red-400'
                            : 'bg-blue-400'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="text-sm text-gray-300">
                      <span className="font-medium text-white">{event.trainId}</span> -{' '}
                      {event.message}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString('de-DE')}
                    </div>
                  </div>
                  {event.lineCode && (
                    <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded">
                      {event.lineCode}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Live-Ereignisse</h2>
            <Link href="/log" className="text-blue-400 hover:text-blue-300 text-sm">
              Alle anzeigen →
            </Link>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentEvents.slice(0, 10).map((event, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    event.type === 'maintenance_started'
                      ? 'bg-yellow-400'
                      : event.type === 'maintenance_completed'
                        ? 'bg-green-400'
                        : event.type === 'alert'
                          ? 'bg-red-400'
                          : 'bg-blue-400'
                  }`}
                />
                <div className="flex-1">
                  <div className="text-sm text-gray-300">
                    <span className="font-medium text-white">{event.trainId}</span> -{' '}
                    {event.message}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString('de-DE')}
                  </div>
                </div>
                {event.lineCode && (
                  <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded">
                    {event.lineCode}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/map"
            className="bg-blue-900/50 border border-blue-800 rounded-lg p-4 hover:bg-blue-900/70 transition-all"
          >
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">Live-Karte</span>
            </div>
          </Link>
          <Link
            href="/maintenance"
            className="bg-yellow-900/50 border border-yellow-800 rounded-lg p-4 hover:bg-yellow-900/70 transition-all"
          >
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">Wartung</span>
            </div>
          </Link>
          <Link
            href="/trains"
            className="bg-green-900/50 border border-green-800 rounded-lg p-4 hover:bg-green-900/70 transition-all"
          >
            <div className="flex items-center gap-3">
              <Train className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">Fahrzeuge</span>
            </div>
          </Link>
          <Link
            href="/ecm"
            className="bg-purple-900/50 border border-purple-800 rounded-lg p-4 hover:bg-purple-900/70 transition-all"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-purple-400" />
              <span className="text-white font-medium">ECM Portal</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
