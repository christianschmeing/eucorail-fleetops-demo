'use client';

import { useState } from 'react';
import { useFleetStore } from '@/lib/state/fleet-store';
import Link from 'next/link';
import { MaintenanceInfo, MaintenanceInterval } from '@/types/train';

interface Train {
  id: string;
  lineId: string;
  region: string;
  status: string;
  depot: string;
  series?: string;
  vehicleType?: string;
  manufacturer?: string;
  mileageKm?: number;
  delayMin?: number;
  speedKmh?: number;
  healthScore?: number;
  maintenanceInfo?: MaintenanceInfo;
  [key: string]: any;
}

interface TrainDetailClientProps {
  train: Train;
}

// Helper für Ampel-Status
function getStatusColor(status: 'green' | 'yellow' | 'red') {
  if (status === 'green') return 'text-green-400';
  if (status === 'yellow') return 'text-yellow-400';
  return 'text-red-400';
}

// Maintenance Card Komponente
function MaintenanceCard({ type, interval }: { type: string; interval?: MaintenanceInterval }) {
  if (!interval) return null;

  const percentUsed = ((interval.kmSinceLast / interval.intervalKm) * 100).toFixed(1);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-white">{type}</h3>
        <div className={`flex items-center gap-1 ${getStatusColor(interval.status)}`}>
          <div
            className={`w-3 h-3 rounded-full ${
              interval.status === 'green'
                ? 'bg-green-400'
                : interval.status === 'yellow'
                  ? 'bg-yellow-400'
                  : 'bg-red-400'
            }`}
          />
          <span className="text-sm font-medium">
            {interval.status === 'green'
              ? 'OK'
              : interval.status === 'yellow'
                ? 'Bald fällig'
                : 'Überfällig'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Verbrauch</span>
            <span>{percentUsed}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                interval.status === 'green'
                  ? 'bg-green-500'
                  : interval.status === 'yellow'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, parseFloat(percentUsed))}%` }}
            />
          </div>
        </div>

        {/* Metriken Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-400">Seit letzter Wartung</div>
            <div className="text-sm font-medium text-white">
              {interval.kmSinceLast.toLocaleString()} km
            </div>
            <div className="text-xs text-gray-500">{interval.daysSinceLast} Tage</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Restlauf</div>
            <div className="text-sm font-medium text-white">
              {interval.restKm.toLocaleString()} km
            </div>
            <div className="text-xs text-gray-500">{interval.restDays} Tage</div>
          </div>
        </div>

        {/* Intervall Info */}
        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            Intervall: {interval.intervalKm.toLocaleString()} km / {interval.intervalDays} Tage
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Nächste Fälligkeit: {new Date(interval.nextDate).toLocaleDateString('de-DE')}
          </div>
        </div>

        {/* Formel Tooltip */}
        <div className="mt-2 p-2 bg-gray-900 rounded text-xs">
          <div className="text-gray-400 mb-1">Berechnung:</div>
          <code className="text-blue-400">
            Restlauf = {interval.intervalKm.toLocaleString()} -{' '}
            {interval.kmSinceLast.toLocaleString()} = {interval.restKm.toLocaleString()} km
          </code>
        </div>
      </div>
    </div>
  );
}

export default function TrainDetailClient({ train }: TrainDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'history'>('overview');
  const activeTcms = useFleetStore((s) => s.activeTcms[train.id] || []);
  const critical = activeTcms.some((e: any) => e.severity === 'CRITICAL');

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-gray-800 p-6 border-b border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <Link
              href="/trains"
              className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-flex items-center gap-1"
            >
              ← Zurück zur Übersicht
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">Fahrzeug {train.id}</h1>
            <div className="flex gap-4 text-gray-300">
              <span>
                Linie: <span className="text-white font-medium">{train.lineId}</span>
              </span>
              <span>
                Serie:{' '}
                <span className="text-white font-medium">{train.series || train.vehicleType}</span>
              </span>
              <span>
                Laufleistung:{' '}
                <span className="text-white font-medium">
                  {train.mileageKm?.toLocaleString() || 0} km
                </span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`px-3 py-1 text-sm rounded ${
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
          </div>
        </div>
        {critical && (
          <div className="mt-3 p-3 rounded bg-red-900/30 border border-red-700 text-red-200">
            ⚠ Kritische TCMS‑Meldung aktiv – Fahrt nur eingeschränkt. Bitte Disposition
            informieren.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="flex gap-1 p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Übersicht
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'maintenance'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Wartungsintervalle
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Historie
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basis-Informationen */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-4">Fahrzeuginformationen</h2>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Fahrzeug-ID</dt>
                  <dd className="text-white font-medium">{train.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">UIC-Nummer</dt>
                  <dd className="text-white font-medium">{train.uic || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Hersteller</dt>
                  <dd className="text-white font-medium">{train.manufacturer || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Fahrzeugtyp</dt>
                  <dd className="text-white font-medium">{train.vehicleType || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Heimat-Depot</dt>
                  <dd className="text-white font-medium">{train.depot}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Region</dt>
                  <dd className="text-white font-medium">{train.region}</dd>
                </div>
              </dl>
            </div>

            {/* Betriebsdaten */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-4">Betriebsdaten</h2>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Gesamtlaufleistung</dt>
                  <dd className="text-white font-medium">
                    {train.mileageKm?.toLocaleString() || 0} km
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Aktuelle Geschwindigkeit</dt>
                  <dd className="text-white font-medium">{train.speedKmh || 0} km/h</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Verspätung</dt>
                  <dd
                    className={`font-medium ${
                      (train.delayMin || 0) > 5
                        ? 'text-red-400'
                        : (train.delayMin || 0) > 0
                          ? 'text-yellow-400'
                          : 'text-green-400'
                    }`}
                  >
                    {(train.delayMin || 0) > 0 ? '+' : ''}
                    {train.delayMin || 0} min
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Health Score</dt>
                  <dd className="text-white font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (train.healthScore || 0) >= 90
                              ? 'bg-green-500'
                              : (train.healthScore || 0) >= 75
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${train.healthScore || 0}%` }}
                        />
                      </div>
                      <span>{train.healthScore || 0}%</span>
                    </div>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Batterieladung</dt>
                  <dd className="text-white font-medium">{train.socPct || 0}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Auslastung</dt>
                  <dd className="text-white font-medium">{train.occupancyPct || 0}%</dd>
                </div>
              </dl>
            </div>

            {/* Alerts */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-4">TCMS‑Alerts</h2>
              {activeTcms.length === 0 ? (
                <div className="text-sm text-gray-400">Keine aktiven Meldungen</div>
              ) : (
                <div className="space-y-2">
                  {activeTcms.map((e: any) => (
                    <div key={e.code} className="p-2 rounded border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-white font-medium">{e.code}</div>
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${e.severity === 'CRITICAL' ? 'bg-red-600/30 text-red-300' : e.severity === 'ALARM' ? 'bg-orange-600/30 text-orange-300' : e.severity === 'WARN' ? 'bg-yellow-600/30 text-yellow-300' : 'bg-gray-600/30 text-gray-300'}`}
                        >
                          {e.severity}
                        </span>
                      </div>
                      <div className="text-xs text-gray-300 mt-1">{e.humanMessage}</div>
                      {e.suggestedAction && (
                        <div className="text-xs text-gray-400 mt-1">
                          Aktion: {e.suggestedAction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Wartungsübersicht */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 lg:col-span-2">
              <h2 className="text-lg font-semibold text-white mb-4">Wartungsübersicht</h2>
              <div className="grid grid-cols-5 gap-4">
                {['IS1', 'IS2', 'IS3', 'IS4', 'Lathe'].map((type) => {
                  const interval = train.maintenanceInfo?.[type as keyof MaintenanceInfo];
                  if (!interval) return null;

                  return (
                    <div key={type} className="text-center">
                      <div className="text-sm text-gray-400 mb-1">{type}</div>
                      <div
                        className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                          interval.status === 'green'
                            ? 'bg-green-500/20'
                            : interval.status === 'yellow'
                              ? 'bg-yellow-500/20'
                              : 'bg-red-500/20'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            interval.status === 'green'
                              ? 'bg-green-400'
                              : interval.status === 'yellow'
                                ? 'bg-yellow-400'
                                : 'bg-red-400'
                          }`}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {interval.restKm.toLocaleString()} km
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <MaintenanceCard type="IS1 – Prüfung" interval={train.maintenanceInfo?.IS1} />
            <MaintenanceCard type="IS2 - Monatswartung" interval={train.maintenanceInfo?.IS2} />
            <MaintenanceCard type="IS3 - Quartalswartung" interval={train.maintenanceInfo?.IS3} />
            <MaintenanceCard type="IS4 - Hauptuntersuchung" interval={train.maintenanceInfo?.IS4} />
            <MaintenanceCard
              type="Lathe - Radsatzdrehung"
              interval={train.maintenanceInfo?.Lathe}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <p className="text-gray-400">
              Wartungshistorie wird in zukünftigen Versionen verfügbar sein.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
