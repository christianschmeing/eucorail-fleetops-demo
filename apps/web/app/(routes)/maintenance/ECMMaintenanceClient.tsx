'use client';

import { useState, useEffect } from 'react';
import { Calendar, Wrench, AlertTriangle, CheckCircle, Clock, Users, Settings } from 'lucide-react';

interface WorkOrder {
  id: string;
  trainId: string;
  vehicleType?: string;
  type: 'IS1' | 'IS2' | 'IS3' | 'IS4' | 'lathe' | 'cleaning' | 'corrective' | 'accident';
  title: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: string;
  assignedTo: string;
  ecmLevel?: 2 | 3 | 4;
  estimatedDuration?: number;
  skillsRequired?: string[];
  featuresRequired?: string[];
}

interface MaintenanceTask {
  type: string;
  name: string;
  description: string;
  intervalDays?: number;
  intervalKm?: number;
  durationHours: number;
  teamSize: number;
  skillsRequired: string[];
  featuresRequired: string[];
}

interface ECMMaintenanceClientProps {
  workOrders: WorkOrder[];
  depotCapacity: any[];
  riskParts: any[];
  fleetSize: number;
  vehicleTypes?: Record<string, number>;
  maintenanceTasks?: MaintenanceTask[];
}

const ECM_LEVELS = {
  2: { name: 'ECM-2', label: 'Wartungsentwicklung', color: 'purple' },
  3: { name: 'ECM-3', label: 'Wartungsmanagement', color: 'blue' },
  4: { name: 'ECM-4', label: 'Durchführung', color: 'green' }
};

const WORK_TYPE_LABELS = {
  IS1: 'Tägliche Prüfung',
  IS2: 'Monatswartung',
  IS3: 'Quartalswartung',
  IS4: 'Hauptuntersuchung',
  lathe: 'Radreprofilierung',
  cleaning: 'Reinigung',
  corrective: 'Korrektiv',
  accident: 'Unfall'
};

const VEHICLE_TYPE_COLORS = {
  flirt_3_160: { bg: 'bg-blue-900/50', text: 'text-blue-300', label: 'FLIRT' },
  mireo_3_plus_h: { bg: 'bg-green-900/50', text: 'text-green-300', label: 'Mireo H2' },
  desiro_hc: { bg: 'bg-purple-900/50', text: 'text-purple-300', label: 'Desiro HC' }
};

export default function ECMMaintenanceClient({ 
  workOrders, 
  depotCapacity, 
  riskParts, 
  fleetSize,
  vehicleTypes = {},
  maintenanceTasks = []
}: ECMMaintenanceClientProps) {
  const [selectedECMLevel, setSelectedECMLevel] = useState<number | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<string | null>(null);
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);
  
  // Gruppiere Work Orders nach ECM-Level
  const woByECMLevel = {
    2: workOrders.filter(wo => wo.ecmLevel === 2),
    3: workOrders.filter(wo => wo.ecmLevel === 3),
    4: workOrders.filter(wo => wo.ecmLevel === 4)
  };
  
  // Berechne Statistiken
  const openWOs = workOrders.filter(wo => wo.status === 'OPEN').length;
  const criticalWOs = workOrders.filter(wo => wo.priority === 'CRITICAL').length;
  const overdueWOs = workOrders.filter(wo => 
    wo.status !== 'COMPLETED' && new Date(wo.dueDate) < new Date()
  ).length;
  
  // Fahrzeugtyp-Verteilung in Wartung
  const maintenanceByVehicleType = workOrders.reduce((acc, wo) => {
    const type = wo.vehicleType || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-900 to-gray-800 p-6 border-b border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-2">ECM Wartungsmanagement</h1>
        <p className="text-gray-300">
          Entity in Charge of Maintenance • IHB-basierte Wartungsplanung
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* ECM-Level Übersicht */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(ECM_LEVELS).map(([level, info]) => {
            const levelNum = parseInt(level);
            const count = woByECMLevel[levelNum as keyof typeof woByECMLevel].length;
            
            return (
              <div 
                key={level}
                onClick={() => setSelectedECMLevel(levelNum === selectedECMLevel ? null : levelNum)}
                className={`bg-gray-800 border rounded-xl p-6 cursor-pointer transition-all ${
                  selectedECMLevel === levelNum 
                    ? `border-${info.color}-500 shadow-lg` 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className={`text-2xl font-bold text-${info.color}-400`}>
                      {info.name}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {info.label}
                    </div>
                  </div>
                  <div className={`text-3xl font-bold text-white`}>
                    {count}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {count > 0 && (
                    <div className="space-y-1 mt-3">
                      {woByECMLevel[levelNum as keyof typeof woByECMLevel]
                        .slice(0, 3)
                        .map(wo => (
                          <div key={wo.id} className="flex justify-between">
                            <span>{wo.trainId}</span>
                            <span className="text-gray-400">
                              {WORK_TYPE_LABELS[wo.type as keyof typeof WORK_TYPE_LABELS]}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hauptwidgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Flottenabdeckung */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Flottenabdeckung</h2>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="space-y-3">
              <div className="text-3xl font-bold text-white">
                {fleetSize}/{fleetSize} Züge
              </div>
              <div className="text-sm text-gray-400">im Wartungsplan</div>
              
              {/* Fahrzeugtyp-Verteilung */}
              <div className="mt-4 space-y-2">
                {Object.entries(vehicleTypes).map(([type, count]) => {
                  const typeInfo = VEHICLE_TYPE_COLORS[type as keyof typeof VEHICLE_TYPE_COLORS];
                  if (!typeInfo) return null;
                  
                  return (
                    <div key={type} className="flex justify-between items-center">
                      <span className={`text-sm ${typeInfo.text}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-sm text-gray-400">
                        {count} Züge
                      </span>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Offene Arbeitsaufträge */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Arbeitsaufträge</h2>
              <Wrench className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-3xl font-bold text-white">{openWOs}</div>
                  <div className="text-sm text-gray-400">offen</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold text-red-400">{criticalWOs}</div>
                  <div className="text-xs text-gray-400">kritisch</div>
                </div>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Überfällig:</span>
                  <span className={overdueWOs > 0 ? 'text-red-400' : 'text-gray-300'}>
                    {overdueWOs}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">In Arbeit:</span>
                  <span className="text-gray-300">
                    {workOrders.filter(wo => wo.status === 'IN_PROGRESS').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Abgeschlossen:</span>
                  <span className="text-green-400">
                    {workOrders.filter(wo => wo.status === 'COMPLETED').length}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-500">Nach Typ:</div>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {Object.entries(WORK_TYPE_LABELS).slice(0, 6).map(([type, label]) => {
                    const count = workOrders.filter(wo => wo.type === type).length;
                    return (
                      <div key={type} className="flex justify-between text-xs">
                        <span className="text-gray-400">{label}:</span>
                        <span className="text-gray-300">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Depot-Kapazität */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Depot-Kapazität</h2>
              <Settings className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-4">
              {['Essingen', 'Langweid'].map(depot => {
                const todayCapacity = depotCapacity.find(
                  c => c.depot === depot && c.date === new Date().toISOString().split('T')[0]
                );
                const utilization = todayCapacity 
                  ? (todayCapacity.usedSlots / todayCapacity.totalSlots) * 100
                  : 0;
                
                return (
                  <div key={depot}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-300">{depot}</span>
                      <span className="text-sm text-gray-400">
                        {todayCapacity?.usedSlots || 0}/{todayCapacity?.totalSlots || 20} Gleise
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          utilization > 80 ? 'bg-red-500' : 
                          utilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {utilization.toFixed(0)}% ausgelastet
                    </div>
                  </div>
                );
              })}
              
              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-500 mb-2">14-Tage Vorschau:</div>
                <div className="grid grid-cols-7 gap-1">
                  {depotCapacity.slice(0, 14).map((cap, idx) => {
                    const util = (cap.usedSlots / cap.totalSlots) * 100;
                    return (
                      <div 
                        key={idx}
                        className={`h-8 rounded ${
                          util > 80 ? 'bg-red-900/50' : 
                          util > 60 ? 'bg-yellow-900/50' : 'bg-green-900/50'
                        } flex items-center justify-center text-xs text-gray-400`}
                        title={`${cap.depot}: ${cap.date}`}
                      >
                        {idx + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Risikoteile */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Teile mit erhöhtem Risiko</h2>
            <AlertTriangle className="h-6 w-6 text-orange-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Teil-ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Bezeichnung
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Risiko
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Betroffene Züge
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Letzter Vorfall
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Aktion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {riskParts.slice(0, 5).map(part => (
                  <tr key={part.partId} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-300">{part.partId}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{part.partName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        part.riskLevel === 'HIGH' ? 'bg-red-900 text-red-200' :
                        part.riskLevel === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-green-900 text-green-200'
                      }`}>
                        {part.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      <span className="font-semibold">{part.affectedTrains.length}</span>/{fleetSize}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {new Date(part.lastIncident).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-blue-400 hover:text-blue-300 text-sm">
                        Plan erstellen →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* IHB-Profile Info */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">IHB-Profile & Wartungsintervalle</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-2">Stadler FLIRT</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">IS1:</span>
                  <span className="text-gray-300">Täglich / 2.000 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IS2:</span>
                  <span className="text-gray-300">45 Tage / 30.000 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IS3:</span>
                  <span className="text-gray-300">180 Tage / 100.000 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IS4:</span>
                  <span className="text-gray-300">2 Jahre / 400.000 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Lathe:</span>
                  <span className="text-gray-300">150.000 km</span>
                </div>
              </div>
            </div>
            
            <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-4">
              <h3 className="text-green-400 font-semibold mb-2">Siemens Mireo H2</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">IS1:</span>
                  <span className="text-gray-300">Täglich / 2.500 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IS2:</span>
                  <span className="text-gray-300">40 Tage / 35.000 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IS3:</span>
                  <span className="text-gray-300">150 Tage / 120.000 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IS4:</span>
                  <span className="text-gray-300">2 Jahre / 500.000 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Lathe:</span>
                  <span className="text-gray-300">180.000 km</span>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-4">
              <h3 className="text-purple-400 font-semibold mb-2">Siemens Desiro HC</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">IS1:</span>
                  <span className="text-gray-300">Täglich / 2.200 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IS2:</span>
                  <span className="text-gray-300">50 Tage / 40.000 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IS3:</span>
                  <span className="text-gray-300">200 Tage / 140.000 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IS4:</span>
                  <span className="text-gray-300">3 Jahre / 600.000 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Lathe:</span>
                  <span className="text-gray-300">200.000 km</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
