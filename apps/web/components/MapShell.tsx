"use client";
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import TrainMarkers from './TrainMarkers';

export default function MapShell() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedTrain, setSelectedTrain] = useState<string | null>(null);
  const [fleetHealth, setFleetHealth] = useState({
    active: 7,
    maintenance: 2,
    inspection: 1,
    stationary: 2
  });
  const [recentMessages, setRecentMessages] = useState([
    { id: 1, trainId: 'RE9-78001', message: 'Wartung fällig - Depot Langweid', type: 'warning', timestamp: '10:23' },
    { id: 2, trainId: 'MEX16-66012', message: 'ETCS-System gestört', type: 'error', timestamp: '10:15' },
    { id: 3, trainId: 'RE8-79021', message: 'Pünktlich in Stuttgart Hbf', type: 'info', timestamp: '10:08' },
    { id: 4, trainId: 'RE9-78002', message: 'Geschwindigkeit normalisiert', type: 'info', timestamp: '09:55' }
  ]);
  
  // Global flag to prevent duplicate depot source creation
  const depotSourceAddedRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    console.log('🗺️ Creating map instance...');
    
    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: [10.5, 48.5], // Center of Bavaria/Baden-Württemberg
        zoom: 8,
        maxZoom: 18,
        minZoom: 6
      });
      
      console.log('🗺️ Map instance created, adding controls...');
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      
      // Add rail layer when map loads
      map.on("load", () => {
        console.log('✅ Map loaded successfully');
        setReady(true);
        
        // Add depot icon to map (only after map is loaded)
        const depotIcon = new Image();
        depotIcon.onload = () => {
          if (map && map.hasImage && !map.hasImage('depot-icon')) {
            map.addImage('depot-icon', depotIcon);
            console.log('✅ Depot icon added to map');
          }
        };
        depotIcon.src = 'data:image/svg+xml;base64,' + btoa(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#FF6B35" stroke="#FFFFFF" stroke-width="2"/>
            <path d="M8 10h8v4H8z" fill="#FFFFFF"/>
            <path d="M10 14h4v2h-4z" fill="#FFFFFF"/>
            <path d="M12 6v4" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `);
        
        // This block is now handled by the useEffect hook below
        
        // Add depot polygons layer
        if (map && !map.getLayer('depot_polygons')) {
          map.addLayer({
            id: 'depot_polygons',
            type: 'fill',
            source: 'depots',
            paint: {
              'fill-color': '#FF6B35',
              'fill-opacity': 0.1
            }
          });
          console.log('✅ Depot polygons layer added');
        }
        
        console.log('✅ Depot layers added successfully');
      });
      
      mapRef.current = map;
      
      return () => {
        if (mapRef.current) {
          console.log('🗺️ Cleaning up map on unmount...');
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (error) {
      console.error('❌ Error creating map:', error);
    }
  }, []);

  // Load depot data when map is ready
  useEffect(() => {
    if (!ready || !mapRef.current || depotSourceAddedRef.current) return;

    fetch('/config/depots.json')
      .then(res => res.json())
      .then(data => {
        console.log('Loading depot data:', data);
        
        // Only add source if it doesn't exist and hasn't been added before
        if (!mapRef.current?.getSource('depots') && !depotSourceAddedRef.current) {
          mapRef.current.addSource('depots', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: data.depots.map((depot: any) => ({
                type: 'Feature',
                properties: { id: depot.id, name: depot.name, type: 'depot' },
                geometry: {
                  type: 'Point',
                  coordinates: [depot.lon, depot.lat]
                }
              }))
            }
          });
          
          // Only add layer if it doesn't exist
          if (!mapRef.current?.getLayer('depot-symbols')) {
            mapRef.current.addLayer({
              id: 'depot-symbols',
              type: 'symbol',
              source: 'depots',
              layout: {
                'icon-image': 'depot-icon',
                'icon-size': 1.2,
                'icon-allow-overlap': true,
                'text-field': ['get', 'name'],
                'text-size': 12,
                'text-offset': [0, 1.5],
                'text-anchor': 'top'
              },
              paint: {
                'text-color': '#FF6B35',
                'text-halo-color': '#0B1F2A',
                'text-halo-width': 2
              }
            });
          }
          
          depotSourceAddedRef.current = true;
          console.log('✅ Depot source and layer added successfully');
        }
      })
      .catch(err => {
        console.error('Failed to load depots:', err);
        // Add fallback depot markers only if source doesn't exist and hasn't been added before
        if (mapRef.current && !mapRef.current.getSource('depots') && !depotSourceAddedRef.current) {
          const fallbackDepots = [
            { id: 'langweid', name: 'Langweid', lon: 10.8569, lat: 48.4908 },
            { id: 'essingen', name: 'Essingen', lon: 9.3072, lat: 48.8089 }
          ];
          
          mapRef.current.addSource('depots', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: fallbackDepots.map(depot => ({
                type: 'Feature',
                properties: { id: depot.id, name: depot.name, type: 'depot' },
                geometry: {
                  type: 'Point',
                  coordinates: [depot.lon, depot.lat]
                }
              }))
            }
          });

          // Only add layer if it doesn't exist
          if (!mapRef.current.getLayer('depot-symbols')) {
            mapRef.current.addLayer({
              id: 'depot-symbols',
              type: 'symbol',
              source: 'depots',
              layout: {
                'icon-image': 'depot-icon',
                'icon-size': 1.2,
                'icon-allow-overlap': true,
                'text-field': ['get', 'name'],
                'text-size': 12,
                'text-offset': [0, 1.5],
                'text-anchor': 'top'
              },
              paint: {
                'text-color': '#FF6B35',
                'text-halo-color': '#0B1F2A',
                'text-halo-width': 2
              }
            });
          }
          
          depotSourceAddedRef.current = true;
          console.log('✅ Fallback depot source and layer added successfully');
        }
      });
  }, [ready]);

  // Handle train selection
  const handleTrainSelect = (trainId: string) => {
    setSelectedTrain(trainId);
    console.log('🚂 Train selected in MapShell:', trainId);
  };

  // Health check system
  const getHealthScore = (trainId: string): number => {
    // Simulate health scores based on train ID
    const scores: Record<string, number> = {
      'RE9-78001': 65, // Maintenance due
      'RE9-78002': 92,
      'RE8-79021': 88,
      'RE8-79022': 95,
      'MEX16-66011': 78,
      'MEX16-66012': 45, // Inspection due
      'BY-12345': 82,
      'BW-67890': 90
    };
    return scores[trainId] || 85;
  };

  const getHealthColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBadge = (score: number): string => {
    if (score >= 80) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const getSubsystemStatus = (trainId: string) => {
    // Simulate subsystem statuses
    const subsystems = {
      'RE9-78001': {
        antrieb: 'warning',
        bremse: 'ok',
        etcs: 'ok',
        tueren: 'critical',
        hvac: 'ok',
        energie: 'warning'
      },
      'MEX16-66012': {
        antrieb: 'ok',
        bremse: 'warning',
        etcs: 'critical',
        tueren: 'ok',
        hvac: 'ok',
        energie: 'warning'
      }
    };
    return subsystems[trainId as keyof typeof subsystems] || {
      antrieb: 'ok',
      bremse: 'ok',
      etcs: 'ok',
      tueren: 'ok',
      hvac: 'ok',
      energie: 'ok'
    };
  };

  return (
    <div className="h-screen w-screen bg-[#0B1F2A] text-white overflow-hidden">
      {/* Header */}
      <header className="bg-[#1A2F3A] border-b border-[#2A3F4A] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-[#FF6B35] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Eucorail FleetOps</h1>
              <p className="text-sm text-gray-400">Live-Map für Regionalzüge in Bayern und Baden-Württemberg</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Fleet Health Overview */}
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{fleetHealth.active}</div>
                <div className="text-xs text-gray-400">Aktiv</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{fleetHealth.maintenance}</div>
                <div className="text-xs text-gray-400">Wartung</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{fleetHealth.inspection}</div>
                <div className="text-xs text-gray-400">Prüfung</div>
              </div>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400">System Online</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Train List */}
        <aside className="w-80 bg-[#1A2F3A] border-r border-[#2A3F4A] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Zugliste</h2>
            
            {/* Filter Tiles */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button className="bg-[#2A3F4A] hover:bg-[#3A4F5A] px-3 py-2 rounded text-sm transition-colors">
                Alle Züge
              </button>
              <button className="bg-[#2A3F4A] hover:bg-[#3A4F5A] px-3 py-2 rounded text-sm transition-colors">
                Nur Aktiv
              </button>
            </div>
            
            {/* Line Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs transition-colors">
                RE9
              </button>
              <button className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs transition-colors">
                RE8
              </button>
              <button className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-xs transition-colors">
                MEX16
              </button>
            </div>
            
            {/* Train List */}
            <div className="space-y-2">
              {[
                { id: 'RE9-78001', name: 'RE9 78001', status: 'maintenance', speed: 0, health: 65 },
                { id: 'RE9-78002', name: 'RE9 78002', status: 'active', speed: 85, health: 92 },
                { id: 'RE8-79021', name: 'RE8 79021', status: 'active', speed: 92, health: 88 },
                { id: 'RE8-79022', name: 'RE8 79022', status: 'active', speed: 78, health: 95 },
                { id: 'MEX16-66011', name: 'MEX16 66011', status: 'active', speed: 95, health: 78 },
                { id: 'MEX16-66012', name: 'MEX16 66012', status: 'inspection', speed: 0, health: 45 },
                { id: 'BY-12345', name: 'BY 12345', status: 'stationary', speed: 0, health: 82 },
                { id: 'BW-67890', name: 'BW 67890', status: 'stationary', speed: 0, health: 90 }
              ].map(train => (
                <div
                  key={train.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTrain === train.id 
                      ? 'bg-[#FF6B35] text-white' 
                      : 'bg-[#2A3F4A] hover:bg-[#3A4F5A]'
                  }`}
                  onClick={() => handleTrainSelect(train.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{train.name}</div>
                      <div className="text-xs opacity-75">
                        {train.status === 'active' ? `${train.speed} km/h` : train.status}
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      train.status === 'active' ? 'bg-green-400' :
                      train.status === 'maintenance' ? 'bg-yellow-400' :
                      train.status === 'inspection' ? 'bg-red-400' :
                      'bg-gray-400'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Map Area */}
        <main className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full" />
          
          {/* Map Controls Overlay */}
          <div className="absolute top-4 left-4 space-y-2">
            <button className="bg-white/10 backdrop-blur-sm hover:bg-white/20 p-2 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="bg-white/10 backdrop-blur-sm hover:bg-white/20 p-2 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {/* Recent Messages Overlay */}
          <div className="absolute top-4 right-4 w-80 bg-[#1A2F3A]/90 backdrop-blur-sm rounded-lg border border-[#2A3F4A]">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-3">Letzte Meldungen</h3>
              <div className="space-y-2">
                {recentMessages.map(message => (
                  <div
                    key={message.id}
                    className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                      message.type === 'error' ? 'bg-red-500/20 text-red-300' :
                      message.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}
                    onClick={() => handleTrainSelect(message.trainId)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{message.trainId}</span>
                      <span className="opacity-75">{message.timestamp}</span>
                    </div>
                    <div className="mt-1">{message.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Selected Train Details */}
        {selectedTrain && (
          <aside className="w-80 bg-[#1A2F3A] border-l border-[#2A3F4A] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Zug Details</h2>
                <button 
                  onClick={() => setSelectedTrain(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Train Info */}
                <div className="bg-[#2A3F4A] p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">{selectedTrain}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <span className="ml-2 text-green-400">Aktiv</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Geschwindigkeit:</span>
                      <span className="ml-2">85 km/h</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Position:</span>
                      <span className="ml-2">48.5°N, 10.5°E</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Route:</span>
                      <span className="ml-2">München Hbf → Nürnberg Hbf</span>
                    </div>
                  </div>
                </div>
                
                {/* Health Status */}
                <div className="bg-[#2A3F4A] p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Systemstatus</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Gesundheit</span>
                      <span className={`text-sm font-medium ${getHealthColor(getHealthScore(selectedTrain))}`}>
                        {getHealthScore(selectedTrain)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getHealthScore(selectedTrain)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {/* Subsystem Status */}
                <div className="bg-[#2A3F4A] p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Teilsysteme</h3>
                  <div className="space-y-2">
                    {Object.entries(getSubsystemStatus(selectedTrain)).map(([system, status]) => (
                      <div key={system} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{system}</span>
                        <div className={`w-3 h-3 rounded-full ${
                          status === 'ok' ? 'bg-green-400' :
                          status === 'warning' ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`}></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Train Markers Component */}
      <TrainMarkers 
        map={mapRef.current} 
        selectedTrain={selectedTrain}
        onTrainSelect={handleTrainSelect}
      />
    </div>
  );
}

