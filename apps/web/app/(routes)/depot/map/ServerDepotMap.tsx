import React from 'react';
import type { Allocation } from '../depot-data';
import type { TrackGeometry } from '../track-geometries';

interface ServerDepotMapProps {
  depot: 'Essingen' | 'Langweid';
  tracks: TrackGeometry[];
  allocations: Allocation[];
}

const DEPOT_CENTERS = {
  Essingen: { lat: 48.7995, lon: 10.0000 },
  Langweid: { lat: 48.4890, lon: 10.8490 },
};

// This component renders completely on the server
export default function ServerDepotMap({
  depot,
  tracks,
  allocations,
}: ServerDepotMapProps) {
  const center = DEPOT_CENTERS[depot];
  
  // Create static map URL
  const osmMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${center.lon - 0.01},${center.lat - 0.005},${center.lon + 0.01},${center.lat + 0.005}&layer=mapnik`;
  
  return (
    <div className="w-full h-full bg-gray-800 relative">
      {/* Static OpenStreetMap iframe - works without JavaScript */}
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        src={osmMapUrl}
        className="absolute inset-0"
        title={`Depot ${depot} Map`}
      />
      
      {/* Info overlay */}
      <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Depot {depot}</h2>
        <div className="space-y-1">
          <p className="text-sm">📍 Gleise: {tracks.length}</p>
          <p className="text-sm">🚂 Züge: {allocations.length}</p>
          <p className="text-sm">✅ Frei: {tracks.filter(t => t.state === 'frei').length}</p>
          <p className="text-sm">🟡 Belegt: {tracks.filter(t => t.state === 'belegt').length}</p>
        </div>
      </div>
      
      {/* Track list */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg max-h-64 overflow-y-auto">
        <h3 className="font-bold mb-2">Gleisbelegung:</h3>
        <div className="space-y-1 text-xs">
          {tracks.map(track => {
            const trackAllocation = allocations.find(a => a.trackId === track.id);
            return (
              <div key={track.id} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  track.state === 'frei' ? 'bg-green-500' :
                  track.state === 'belegt' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`} />
                <span>{track.name}:</span>
                <span className="text-gray-300">
                  {trackAllocation ? trackAllocation.train_id : 'Frei'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
