export interface Depot {
  id: string;
  name: 'Essingen' | 'Langweid';
  location: {
    lat: number;
    lon: number;
    bounds: [number, number, number, number];
  };
  tracks: Track[];
  capacity: {
    total: number;
    occupied: number;
    maintenance: number;
  };
}

export interface Track {
  id: string;
  depot_id: string;
  type: 'storage' | 'maintenance' | 'washing' | 'entrance' | 'exit' | 'yard';
  geometry: GeoJSON.LineString;
  length: number; // meters
  positions: TrackPosition[];
  connected_to: string[];
}

export interface TrackPosition {
  id: string;
  track_id: string;
  offset: number; // meters from start
  occupied_by?: Vehicle;
  reserved_for?: string;
  blocked?: boolean;
}

export interface Vehicle {
  id: string;
  type: string;
  model: 'FLIRT3' | 'Mireo' | 'Desiro HC' | string;
  status: 'operational' | 'maintenance' | 'cleaning' | 'standby';
  current_position: {
    depot_id?: string;
    track_id?: string;
    position_id?: string;
    on_line?: boolean;
  };
  next_assignment?: {
    departure: string | Date;
    line: string;
    destination: string;
  };
}
