'use client';

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

interface Track {
  id: string;
  name: string;
  length: number;
  features: string[];
}

interface DepotInspectorProps {
  allocation: Allocation;
  track?: Track;
  onClose: () => void;
  onUpdate: (allocation: Allocation) => void;
}

export default function DepotInspector({ 
  allocation, 
  track,
  onClose,
  onUpdate 
}: DepotInspectorProps) {
  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const duration = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
    return duration.toFixed(1);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'In Arbeit': return 'bg-green-500/20 text-green-400';
      case 'QA': return 'bg-yellow-500/20 text-yellow-400';
      case 'Zugewiesen': return 'bg-blue-500/20 text-blue-400';
      case 'Geplant': return 'bg-gray-500/20 text-gray-400';
      case 'Freigegeben': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getRiskColor = (risk?: string) => {
    switch(risk) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gray-700/50 border-b border-gray-600">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {allocation.trainId}
              {allocation.isReserve && (
                <span className="text-sm bg-purple-600/20 text-purple-400 px-2 py-1 rounded">Reserve</span>
              )}
            </h2>
            <p className="text-sm text-gray-400">
              {allocation.lineId} • {allocation.id}
              {allocation.homeDepot && ` • Heimat: ${allocation.homeDepot}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status & IS-Level */}
        <div className="bg-gray-700/30 rounded-lg p-3">
          <h3 className="text-sm font-medium text-white mb-2">Status & Wartungsstufe</h3>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded ${getStatusColor(allocation.status)}`}>
              {allocation.status}
            </span>
            <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded">
              {allocation.isLevel}
            </span>
            {allocation.hasConflict && (
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded">
                ⚠️ Konflikt
              </span>
            )}
          </div>
        </div>

        {/* Zeiten */}
        <div className="bg-gray-700/30 rounded-lg p-3">
          <h3 className="text-sm font-medium text-white mb-2">Zeitplanung</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Start:</span>
              <span className="text-white">{formatDateTime(allocation.startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ende:</span>
              <span className="text-white">{formatDateTime(allocation.endTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Dauer:</span>
              <span className="text-white">{calculateDuration(allocation.startTime, allocation.endTime)}h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">ETA Freigabe:</span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${getRiskColor(allocation.riskLevel)}`}>
                  {formatDateTime(allocation.etaRelease)}
                </span>
                {allocation.riskLevel === 'high' && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                    Risiko
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Gleis-Info */}
        {track && (
          <div className="bg-gray-700/30 rounded-lg p-3">
            <h3 className="text-sm font-medium text-white mb-2">Gleis-Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Gleis:</span>
                <span className="text-white">{track.name} ({track.id})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Länge:</span>
                <span className="text-white">{track.length}m</span>
              </div>
              {track.features.length > 0 && (
                <div>
                  <span className="text-gray-400">Ausstattung:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {track.features.map(feature => (
                      <span key={feature} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aufgaben */}
        <div className="bg-gray-700/30 rounded-lg p-3">
          <h3 className="text-sm font-medium text-white mb-2">Aufgaben</h3>
          <div className="space-y-1">
            {allocation.tasks.map((task, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">{task}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team & Schicht */}
        {(allocation.team || allocation.shift) && (
          <div className="bg-gray-700/30 rounded-lg p-3">
            <h3 className="text-sm font-medium text-white mb-2">Zuordnung</h3>
            <div className="space-y-2 text-sm">
              {allocation.team && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Team:</span>
                  <span className="text-white">{allocation.team}</span>
                </div>
              )}
              {allocation.shift && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Schicht:</span>
                  <span className="text-white">{allocation.shift}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Abhängigkeiten */}
        <div className="bg-gray-700/30 rounded-lg p-3">
          <h3 className="text-sm font-medium text-white mb-2">Abhängigkeiten</h3>
          <p className="text-sm text-gray-400">Keine Abhängigkeiten definiert</p>
        </div>
      </div>

      {/* Aktionen */}
      <div className="p-4 bg-gray-700/50 border-t border-gray-600 space-y-2">
        <button 
          onClick={() => {
            // Log Planungsänderung
            fetch('/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'DEPOT_PLAN_UPDATE',
                timestamp: new Date().toISOString(),
                user: 'System',
                trainId: allocation.trainId,
                details: `Planänderung für ${allocation.trainId} auf Gleis ${allocation.trackId}`
              })
            }).catch(console.error);
            
            onUpdate(allocation);
          }}
          className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          📝 Plan anpassen
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button className="p-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded transition-colors">
            🔄 Verschieben
          </button>
          <button className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors">
            🚫 Sperren
          </button>
        </div>
        {allocation.status === 'QA' && (
          <button 
            onClick={() => {
              // Log Freigabe
              fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'DEPOT_RELEASE',
                  timestamp: new Date().toISOString(),
                  user: 'System',
                  trainId: allocation.trainId,
                  details: `Zug ${allocation.trainId} freigegeben von Gleis ${allocation.trackId}`
                })
              }).catch(console.error);
            }}
            className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            ✅ Freigeben
          </button>
        )}
      </div>
    </div>
  );
}
