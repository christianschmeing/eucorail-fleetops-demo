'use client';

import { useState, useEffect } from 'react';
import { Train, Activity, AlertTriangle, CheckCircle, TrendingUp, Users, Zap, Wrench } from 'lucide-react';
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
}

const VEHICLE_TYPE_INFO = {
  flirt_3_160: { name: 'Stadler FLIRT', color: 'blue', count: 59 },
  mireo_3_plus_h: { name: 'Siemens Mireo H2', color: 'green', count: 49 },
  desiro_hc: { name: 'Siemens Desiro HC', color: 'purple', count: 36 }
};

export default function DashboardClient({ kpiData, recentEvents, trains, lines }: DashboardClientProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Berechne Live-Statistiken
  const activeTrains = trains.filter(t => t.status === 'active').length;
  const maintenanceTrains = trains.filter(t => t.status === 'maintenance').length;
  const reserveTrains = trains.filter(t => t.isReserve).length;
  const criticalAlerts = trains.filter(t => t.status === 'alarm').length;

  // Linien-Gruppierung
  const lineGroups = {
    RE: lines.filter(l => l.code?.startsWith('RE')).length,
    MEX: lines.filter(l => l.code?.startsWith('MEX')).length,
    RB: lines.filter(l => l.code?.startsWith('RB')).length,
    S: lines.filter(l => l.code?.startsWith('S')).length
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
              {currentTime.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Haupt-KPI-Karten */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Verfügbarkeit */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all cursor-pointer"
               onClick={() => setSelectedMetric('availability')}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-900/50 rounded-lg">
                <Train className="h-6 w-6 text-blue-400" />
              </div>
              <span className={`text-2xl font-bold ${kpiData.availabilityPct >= 90 ? 'text-green-400' : kpiData.availabilityPct >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                {kpiData.availabilityPct}%
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-400">Verfügbarkeit</h3>
            <p className="text-2xl font-bold text-white mt-1">{activeTrains}/{kpiData.fleetSize}</p>
            <p className="text-xs text-gray-500 mt-2">Aktive Fahrzeuge</p>
          </div>

          {/* Wartung */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-yellow-500 transition-all cursor-pointer"
               onClick={() => setSelectedMetric('maintenance')}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-900/50 rounded-lg">
                <Wrench className="h-6 w-6 text-yellow-400" />
              </div>
              <span className={`text-2xl font-bold ${maintenanceTrains <= 20 ? 'text-green-400' : maintenanceTrains <= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                {maintenanceTrains}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-400">In Wartung</h3>
            <p className="text-2xl font-bold text-white mt-1">{kpiData.overdueCount}</p>
            <p className="text-xs text-gray-500 mt-2">Überfällige WOs</p>
          </div>

          {/* ECM Compliance */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-green-500 transition-all cursor-pointer"
               onClick={() => setSelectedMetric('compliance')}>
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
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-red-500 transition-all cursor-pointer"
               onClick={() => setSelectedMetric('alerts')}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-900/50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <span className={`text-2xl font-bold ${criticalAlerts === 0 ? 'text-green-400' : criticalAlerts <= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                {criticalAlerts}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-400">Kritische Alarme</h3>
            <p className="text-2xl font-bold text-white mt-1">{reserveTrains}</p>
            <p className="text-xs text-gray-500 mt-2">Reserve-Fahrzeuge</p>
          </div>
        </div>

        {/* Fahrzeugtyp-Verteilung */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Fahrzeugflotte nach Typ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(VEHICLE_TYPE_INFO).map(([key, info]) => (
              <div key={key} className={`bg-${info.color}-900/20 border border-${info.color}-800/50 rounded-lg p-4`}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`text-${info.color}-400 font-semibold`}>{info.name}</h3>
                  <span className="text-2xl font-bold text-white">{info.count}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Aktiv:</span>
                    <span className="text-gray-300">
                      {trains.filter(t => t.vehicleType === key && t.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wartung:</span>
                    <span className="text-gray-300">
                      {trains.filter(t => t.vehicleType === key && t.status === 'maintenance').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reserve:</span>
                    <span className="text-gray-300">
                      {trains.filter(t => t.vehicleType === key && t.isReserve).length}
                    </span>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-${info.color}-500`}
                    style={{ width: `${(trains.filter(t => t.vehicleType === key && t.status === 'active').length / info.count) * 100}%` }}
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
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                      type === 'RE' ? 'bg-blue-600' :
                      type === 'MEX' ? 'bg-red-600' :
                      type === 'RB' ? 'bg-gray-600' :
                      'bg-green-600'
                    }`}>
                      {type}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-300">
                        {type === 'RE' ? 'Regional-Express' :
                         type === 'MEX' ? 'Metropol-Express' :
                         type === 'RB' ? 'Regionalbahn' :
                         'S-Bahn'}
                      </div>
                      <div className="text-xs text-gray-500">{count} Linien</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">
                      {trains.filter(t => t.lineCode?.startsWith(type)).length}
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
              {['Essingen', 'Langweid'].map(depot => {
                const utilization = kpiData.depotUtilToday[depot] || 0;
                const trainsInDepot = trains.filter(t => t.homeDepot === depot && (t.status === 'maintenance' || t.status === 'abstellung')).length;
                
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
                          utilization > 80 ? 'bg-red-500' : 
                          utilization > 60 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{utilization}% ausgelastet</span>
                      <span>{depot === 'Essingen' ? '6 Gleise' : '12 Gleise'}</span>
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

        {/* Live-Events */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Live-Ereignisse</h2>
            <Link href="/log" className="text-blue-400 hover:text-blue-300 text-sm">
              Alle anzeigen →
            </Link>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentEvents.slice(0, 10).map((event, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                <div className={`w-2 h-2 rounded-full ${
                  event.type === 'maintenance_started' ? 'bg-yellow-400' :
                  event.type === 'maintenance_completed' ? 'bg-green-400' :
                  event.type === 'alert' ? 'bg-red-400' :
                  'bg-blue-400'
                }`} />
                <div className="flex-1">
                  <div className="text-sm text-gray-300">
                    <span className="font-medium text-white">{event.trainId}</span> - {event.message}
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
          <Link href="/map" className="bg-blue-900/50 border border-blue-800 rounded-lg p-4 hover:bg-blue-900/70 transition-all">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">Live-Karte</span>
            </div>
          </Link>
          <Link href="/maintenance" className="bg-yellow-900/50 border border-yellow-800 rounded-lg p-4 hover:bg-yellow-900/70 transition-all">
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">Wartung</span>
            </div>
          </Link>
          <Link href="/trains" className="bg-green-900/50 border border-green-800 rounded-lg p-4 hover:bg-green-900/70 transition-all">
            <div className="flex items-center gap-3">
              <Train className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">Fahrzeuge</span>
            </div>
          </Link>
          <Link href="/ecm" className="bg-purple-900/50 border border-purple-800 rounded-lg p-4 hover:bg-purple-900/70 transition-all">
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
