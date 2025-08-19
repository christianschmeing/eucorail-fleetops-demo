'use client';

interface Conflict {
  id: string;
  type: 'Doppelbelegung' | 'Feature-Mismatch' | 'Team-Überbuchung' | 'Kapazität';
  trackId: string;
  trainIds: string[];
  description: string;
  severity: 'low' | 'medium' | 'high';
  time: string;
}

interface Track {
  id: string;
  name: string;
}

interface Allocation {
  id: string;
  trainId: string;
  trackId: string;
}

interface ConflictPanelProps {
  conflicts: Conflict[];
  allocations: Allocation[];
  tracks: Track[];
  onConflictClick: (conflict: Conflict) => void;
}

export default function ConflictPanel({ 
  conflicts, 
  allocations, 
  tracks,
  onConflictClick 
}: ConflictPanelProps) {
  const getSeverityColor = (severity: Conflict['severity']) => {
    switch(severity) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTypeIcon = (type: Conflict['type']) => {
    switch(type) {
      case 'Doppelbelegung':
        return '⚠️';
      case 'Feature-Mismatch':
        return '❌';
      case 'Team-Überbuchung':
        return '👥';
      case 'Kapazität':
        return '📊';
      default:
        return '⚠️';
    }
  };

  const groupedConflicts = conflicts.reduce((acc, conflict) => {
    if (!acc[conflict.type]) {
      acc[conflict.type] = [];
    }
    acc[conflict.type].push(conflict);
    return acc;
  }, {} as Record<string, Conflict[]>);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Konflikte</h2>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">
            Hoch: {conflicts.filter(c => c.severity === 'high').length}
          </span>
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
            Mittel: {conflicts.filter(c => c.severity === 'medium').length}
          </span>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
            Niedrig: {conflicts.filter(c => c.severity === 'low').length}
          </span>
        </div>
      </div>

      {conflicts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-green-400 font-medium">Keine Konflikte gefunden</p>
          <p className="text-gray-500 text-sm mt-1">Alle Belegungen sind konfliktfrei</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedConflicts).map(([type, typeConflicts]) => (
            <div key={type} className="bg-gray-700/30 rounded-lg p-3">
              <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <span className="text-lg">{getTypeIcon(type as Conflict['type'])}</span>
                {type} ({typeConflicts.length})
              </h3>
              
              <div className="space-y-2">
                {typeConflicts.map(conflict => {
                  const track = tracks.find(t => t.id === conflict.trackId);
                  
                  return (
                    <div
                      key={conflict.id}
                      onClick={() => onConflictClick(conflict)}
                      className={`p-3 rounded border cursor-pointer hover:bg-gray-700/50 transition-colors ${
                        getSeverityColor(conflict.severity)
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{conflict.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span>📍 {track?.name || conflict.trackId}</span>
                            <span>⏰ {new Date(conflict.time).toLocaleTimeString('de-DE', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          conflict.severity === 'high' ? 'bg-red-600' :
                          conflict.severity === 'medium' ? 'bg-yellow-600' :
                          'bg-blue-600'
                        } text-white`}>
                          {conflict.severity === 'high' ? 'Hoch' :
                           conflict.severity === 'medium' ? 'Mittel' : 'Niedrig'}
                        </span>
                      </div>
                      
                      {conflict.trainIds.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {conflict.trainIds.map(trainId => (
                            <span 
                              key={trainId}
                              className="px-2 py-1 bg-gray-600/50 text-xs rounded text-gray-300"
                            >
                              {trainId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Aktionen */}
      <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
        <h3 className="text-sm font-medium text-white mb-2">Lösungsvorschläge</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 text-sm">
            🔄 Automatische Umplanung starten
          </button>
          <button className="w-full text-left p-2 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 text-sm">
            📊 Kapazitätsanalyse durchführen
          </button>
          <button className="w-full text-left p-2 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30 text-sm">
            📧 Team-Koordinator benachrichtigen
          </button>
        </div>
      </div>
    </div>
  );
}
