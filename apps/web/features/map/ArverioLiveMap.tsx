'use client';

import { useFleetStore } from '@/lib/state/fleet-store';
import Map, { Marker, Source, Layer } from 'react-map-gl';

const ARVERIO_LINES: Record<
  string,
  { name: string; color: string; coordinates: [number, number][] }
> = {
  RE1: {
    name: 'Residenzbahn',
    color: '#FF6B00',
    coordinates: [
      [8.4044, 49.0093],
      [8.5981, 49.1247],
      [8.9608, 48.9333],
      [9.1829, 48.7847],
      [9.5297, 48.8056],
      [9.7978, 48.7994],
      [10.0933, 48.8378],
    ],
  },
  RE8: {
    name: 'Frankenbahn',
    color: '#0066CC',
    coordinates: [
      [9.9357, 49.7919],
      [9.9639, 49.6847],
      [9.7439, 49.4744],
      [9.5108, 49.3219],
      [9.7386, 49.1],
      [9.1829, 48.7847],
    ],
  },
  RE90: {
    name: 'Murrbahn',
    color: '#00AA00',
    coordinates: [
      [9.1829, 48.7847],
      [9.3219, 48.8669],
      [9.4394, 48.9319],
      [9.5922, 49.0186],
      [9.7386, 49.1],
      [9.5108, 49.3219],
      [10.5714, 49.2958],
      [10.7244, 49.4534],
    ],
  },
  RE9: {
    name: 'Fugger-Express',
    color: '#E30613',
    coordinates: [
      [11.5583, 48.1403],
      [11.4619, 48.1497],
      [10.8856, 48.3653],
      [10.2772, 48.4556],
      [9.9828, 48.3994],
    ],
  },
};

export function ArverioLiveMap() {
  const { vehicles, selectedVehicle, setSelectedVehicle } = useFleetStore();
  const operationalVehicles = vehicles.filter((v) => v.status === 'OPERATIONAL');
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'MAINTENANCE');
  const depotVehicles = vehicles.filter((v) => v.status === 'DEPOT');

  return (
    <div className="relative w-full h-full">
      <Map
        initialViewState={{ longitude: 9.7, latitude: 49.0, zoom: 7 }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
      >
        {Object.entries(ARVERIO_LINES).map(([lineId, line]) => (
          <Source
            key={lineId}
            id={`line-${lineId}`}
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: line.coordinates },
            }}
          >
            <Layer
              id={`line-layer-${lineId}`}
              type="line"
              paint={{ 'line-color': line.color, 'line-width': 3, 'line-opacity': 0.8 }}
            />
          </Source>
        ))}

        <Marker latitude={48.7114} longitude={10.0155} anchor="center">
          <div className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg">
            <div className="font-bold">Essingen</div>
            <div className="text-xs">66 Fahrzeuge</div>
            <div className="text-xs">
              {depotVehicles.filter((v) => v.depot === 'ESS').length} im Depot
            </div>
          </div>
        </Marker>

        <Marker latitude={48.4869} longitude={10.8569} anchor="center">
          <div className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg">
            <div className="font-bold">Langweid</div>
            <div className="text-xs">78 Fahrzeuge</div>
            <div className="text-xs">
              {depotVehicles.filter((v) => v.depot === 'GAB').length} im Depot
            </div>
          </div>
        </Marker>

        {operationalVehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            latitude={vehicle.position?.lat || 48.7847}
            longitude={vehicle.position?.lon || 9.1829}
            anchor="center"
            onClick={() => setSelectedVehicle(vehicle)}
          >
            <div className="relative cursor-pointer hover:scale-110 transition-transform">
              <div className="text-2xl" style={{ transform: `rotate(${vehicle.heading || 0}deg)` }}>
                {vehicle.type === 'DESIRO_HC' ? '🚊' : vehicle.type === 'MIREO' ? '🚄' : '🚆'}
              </div>
              <div
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                style={{ backgroundColor: '#10b981' }}
              />
              <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-1 rounded">
                {vehicle.id}
              </div>
            </div>
          </Marker>
        ))}
      </Map>

      <div className="absolute bottom-4 left-4 bg-black/80 text-white rounded-lg p-4">
        <div className="text-lg font-bold mb-2">Arverio Flotte Status</div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-green-400 font-bold">{operationalVehicles.length}</div>
            <div className="text-gray-400">Im Einsatz</div>
          </div>
          <div>
            <div className="text-yellow-400 font-bold">{maintenanceVehicles.length}</div>
            <div className="text-gray-400">Wartung</div>
          </div>
          <div>
            <div className="text-gray-500 font-bold">{depotVehicles.length}</div>
            <div className="text-gray-400">Depot</div>
          </div>
        </div>
      </div>
    </div>
  );
}
