'use client';

import { useState } from 'react';

interface WorkOrder {
  id: string;
  trainId: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: string;
  assignedTo: string;
}

interface DepotCapacity {
  depot: string;
  date: string;
  totalSlots: number;
  usedSlots: number;
  plannedTrains: number;
}

interface RiskPart {
  partId: string;
  partName: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  affectedTrains: string[];
  lastIncident: string;
}

interface MaintenanceClientProps {
  workOrders: WorkOrder[];
  depotCapacity: DepotCapacity[];
  riskParts: RiskPart[];
  fleetSize: number;
}

export default function MaintenanceClient({ 
  workOrders, 
  depotCapacity, 
  riskParts,
  fleetSize 
}: MaintenanceClientProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Berechnungen
  const openWorkOrdersToday = workOrders.filter(
    wo => wo.status === 'OPEN' && 
    new Date(wo.dueDate).toDateString() === new Date().toDateString()
  );
  
  const affectedTrainsCount = new Set(
    workOrders.filter(wo => wo.status === 'OPEN').map(wo => wo.trainId)
  ).size;

  const next7DaysCapacity = depotCapacity
    .filter(dc => {
      const date = new Date(dc.date);
      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });

  const totalPlanned7Days = next7DaysCapacity.reduce((sum, dc) => sum + dc.plannedTrains, 0);

  const highRiskParts = riskParts.filter(p => p.riskLevel === 'HIGH');
  const totalAffectedByRisk = new Set(
    riskParts.flatMap(p => p.affectedTrains)
  ).size;

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900 to-gray-800 p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Wartungsmanagement</h1>
            <p className="text-gray-300">Flottenabdeckung und Arbeitsaufträge</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{fleetSize}/144</div>
            <div className="text-sm text-gray-300">Züge im System</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'overview' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Übersicht
          </button>
          <button
            onClick={() => setActiveTab('workorders')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'workorders' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Arbeitsaufträge
          </button>
          <button
            onClick={() => setActiveTab('capacity')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'capacity' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Kapazität
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'risks' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Risikoteile
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Flottenabdeckung */}
            <div className="bg-gray-800 border border-green-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Flottenabdeckung</h3>
              <div className="text-3xl font-bold text-green-400 mb-2">
                {fleetSize}/{fleetSize} Züge
              </div>
              <p className="text-sm text-gray-400">im Wartungsplan</p>
              <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '100%' }} />
              </div>
              <p className="text-xs text-green-400 mt-2">✓ Vollständige Abdeckung</p>
            </div>

            {/* Offene Arbeitsaufträge */}
            <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Offene Arbeitsaufträge (heute)</h3>
              <div className="text-3xl font-bold text-yellow-400 mb-2">
                {openWorkOrdersToday.length}
              </div>
              <p className="text-sm text-gray-400">
                Betroffene Züge: <span className="text-white">{affectedTrainsCount}/{fleetSize}</span>
              </p>
              <div className="mt-4 space-y-2">
                {openWorkOrdersToday.slice(0, 3).map(wo => (
                  <div key={wo.id} className="flex justify-between text-sm">
                    <span className="text-gray-300">{wo.trainId}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      wo.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                      wo.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {wo.priority}
                    </span>
                  </div>
                ))}
                {openWorkOrdersToday.length > 3 && (
                  <p className="text-xs text-gray-500">+{openWorkOrdersToday.length - 3} weitere</p>
                )}
              </div>
            </div>

            {/* Kapazität */}
            <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Kapazität (nächste 7 Tage)</h3>
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {totalPlanned7Days}
              </div>
              <p className="text-sm text-gray-400">
                Geplante Züge <span className="text-white">≥{fleetSize}</span>
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Stuttgart</span>
                  <span className="text-white">
                    {next7DaysCapacity.filter(dc => dc.depot === 'Stuttgart')
                      .reduce((sum, dc) => sum + dc.plannedTrains, 0)} Züge
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Augsburg</span>
                  <span className="text-white">
                    {next7DaysCapacity.filter(dc => dc.depot === 'Augsburg')
                      .reduce((sum, dc) => sum + dc.plannedTrains, 0)} Züge
                  </span>
                </div>
              </div>
              <p className="text-xs text-blue-400 mt-3">✓ Ausreichende Kapazität</p>
            </div>

            {/* Teile mit Risiko */}
            <div className="bg-gray-800 border border-red-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Teile mit Risiko</h3>
              <div className="text-3xl font-bold text-red-400 mb-2">
                {highRiskParts.length}
              </div>
              <p className="text-sm text-gray-400">
                Betroffene Züge: <span className="text-white">{totalAffectedByRisk}/{fleetSize}</span>
              </p>
              <div className="mt-4 space-y-2">
                {highRiskParts.slice(0, 3).map(part => (
                  <div key={part.partId} className="flex justify-between text-sm">
                    <span className="text-gray-300">{part.partName}</span>
                    <span className="text-red-400">{part.affectedTrains.length} Züge</span>
                  </div>
                ))}
                {highRiskParts.length > 3 && (
                  <p className="text-xs text-gray-500">+{highRiskParts.length - 3} weitere</p>
                )}
              </div>
            </div>

            {/* Wartungsstatistik */}
            <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Wartungsstatistik</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Planmäßig</span>
                  <span className="text-sm text-white">
                    {Math.round(fleetSize * 0.75)} Züge
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Überfällig</span>
                  <span className="text-sm text-yellow-400">
                    {Math.round(fleetSize * 0.05)} Züge
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Kritisch</span>
                  <span className="text-sm text-red-400">
                    {Math.round(fleetSize * 0.02)} Züge
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">In Wartung</span>
                  <span className="text-sm text-blue-400">
                    {Math.round(fleetSize * 0.18)} Züge
                  </span>
                </div>
              </div>
            </div>

            {/* Compliance */}
            <div className="bg-gray-800 border border-green-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">ECM-Compliance</h3>
              <div className="text-3xl font-bold text-green-400 mb-2">
                92.3%
              </div>
              <p className="text-sm text-gray-400">
                {Math.round(fleetSize * 0.923)}/{fleetSize} konform
              </p>
              <div className="mt-4">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '92.3%' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workorders' && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50 border-b border-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">WO-ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Zug</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Titel</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Priorität</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Fällig</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Zugewiesen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {workOrders.slice(0, 10).map(wo => (
                    <tr key={wo.id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-300">{wo.id}</td>
                      <td className="px-4 py-3 text-sm">
                        <a href={`/trains/${wo.trainId}`} className="text-blue-400 hover:text-blue-300">
                          {wo.trainId}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{wo.title}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          wo.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                          wo.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          wo.status === 'OPEN' ? 'bg-blue-500/20 text-blue-400' :
                          wo.status === 'IN_PROGRESS' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(wo.dueDate).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{wo.assignedTo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'capacity' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['Stuttgart', 'Augsburg'].map(depot => (
              <div key={depot} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">{depot}</h3>
                <div className="space-y-3">
                  {next7DaysCapacity
                    .filter(dc => dc.depot === depot)
                    .slice(0, 7)
                    .map(dc => (
                      <div key={`${dc.depot}-${dc.date}`} className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">
                          {new Date(dc.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (dc.usedSlots / dc.totalSlots) > 0.8 ? 'bg-red-500' :
                                (dc.usedSlots / dc.totalSlots) > 0.6 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${(dc.usedSlots / dc.totalSlots) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">
                            {dc.usedSlots}/{dc.totalSlots}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50 border-b border-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Teil-ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Bezeichnung</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Risikolevel</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Betroffene Züge</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Letzter Vorfall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {riskParts.map(part => (
                    <tr key={part.partId} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-300">{part.partId}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{part.partName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          part.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                          part.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {part.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {part.affectedTrains.length} ({((part.affectedTrains.length / fleetSize) * 100).toFixed(1)}%)
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(part.lastIncident).toLocaleDateString('de-DE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
