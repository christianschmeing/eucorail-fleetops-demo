'use client';

interface Track {
  id: string;
  name: string;
  depot: string;
  length: number;
  features: string[];
  status: 'Frei' | 'Belegt' | 'Gesperrt';
}

interface Allocation {
  id: string;
  trackId: string;
  trainId: string;
  status: 'Geplant' | 'Zugewiesen' | 'In Arbeit' | 'QA' | 'Freigegeben';
}

interface TrackListProps {
  tracks: Track[];
  allocations: Allocation[];
  onTrackSelect: (trackId: string) => void;
}

export default function TrackList({ tracks, allocations, onTrackSelect }: TrackListProps) {
  const getFeatureIcon = (feature: string) => {
    switch(feature) {
      case 'OL':
        return '⚡'; // Oberleitung
      case 'Grube':
        return '🕳️'; // Grube
      case 'Radsatzdrehmaschine':
        return '🔧'; // Unterflur-Radsatzdrehmaschine (Tandem)
      case 'Waschhalle':
        return '🚿'; // Außenreinigungsanlage
      case 'Shore-Power':
        return '🔌'; // Shore-Power Anschluss
      case 'Halle':
        return '🏭'; // Wartungshalle
      default:
        return '•';
    }
  };

  const getStatusColor = (status: Track['status']) => {
    switch(status) {
      case 'Frei':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Belegt':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Gesperrt':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-white mb-4">Gleisübersicht</h2>
      
      <div className="space-y-2">
        {tracks.filter(track => !track.id.includes('Planung')).map(track => {
          const activeAllocations = allocations.filter(
            a => a.trackId === track.id && a.status === 'In Arbeit'
          );
          
          return (
            <div
              key={track.id}
              onClick={() => onTrackSelect(track.id)}
              className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-white">{track.name}</h3>
                  <p className="text-sm text-gray-400">{track.id} • {track.length}m</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(track.status)}`}>
                  {track.status}
                </span>
              </div>
              
              {/* Features */}
              {track.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {track.features.map(feature => (
                    <span
                      key={feature}
                      className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1"
                      title={feature}
                    >
                      <span>{getFeatureIcon(feature)}</span>
                      <span>{feature}</span>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Aktive Arbeiten */}
              {activeAllocations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <p className="text-xs text-gray-400 mb-1">Aktive Arbeiten:</p>
                  {activeAllocations.map(alloc => {
                    const isReserve = alloc.trainId.startsWith('RES-');
                    return (
                      <div key={alloc.id} className="text-xs flex items-center gap-1">
                        <span className="text-yellow-400">•</span>
                        <span className={isReserve ? 'text-purple-400' : 'text-yellow-400'}>
                          {alloc.trainId}
                        </span>
                        {isReserve && <span className="text-purple-400 text-xs">(Reserve)</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Auslastungsbalken */}
              <div className="mt-2">
                <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      track.status === 'Frei' ? 'bg-green-500' :
                      track.status === 'Belegt' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ 
                      width: track.status === 'Frei' ? '0%' : 
                             track.status === 'Belegt' ? '75%' : 
                             '100%' 
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Zusammenfassung */}
      <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
        <h3 className="text-sm font-medium text-white mb-2">Zusammenfassung</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Gesamt:</span>
            <span className="text-white">{tracks.filter(t => !t.id.includes('Planung')).length} Gleise</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Frei:</span>
            <span className="text-green-400">{tracks.filter(t => t.status === 'Frei' && !t.id.includes('Planung')).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Belegt:</span>
            <span className="text-yellow-400">{tracks.filter(t => t.status === 'Belegt' && !t.id.includes('Planung')).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Im Bau/Gesperrt:</span>
            <span className="text-red-400">{tracks.filter(t => t.status === 'Gesperrt').length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Reserve-Züge:</span>
            <span className="text-purple-400">{allocations.filter(a => a.trainId.startsWith('RES-')).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
