export interface TrackGeometry {
  id: string;
  depot: 'Essingen' | 'Langweid';
  type: 'Halle' | 'ARA' | 'Yard';
  name: string;
  lengthM: number;
  length?: number; // Alias for compatibility
  features: ('OL' | 'Grube' | 'Lathe' | 'Wash' | 'Shore')[];
  state: 'frei' | 'belegt' | 'gesperrt' | 'defekt';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  color?: string;
}

// Essingen depot tracks - centered at [10.015, 48.823]
const essingenBase = { lat: 48.823, lng: 10.015 };

// Langweid depot tracks - centered at [10.846, 48.449]  
const langweidBase = { lat: 48.449, lng: 10.846 };

export const trackGeometries: TrackGeometry[] = [
  // === ESSINGEN TRACKS ===
  {
    id: 'E-H1',
    depot: 'Essingen',
    type: 'Halle',
    name: 'Halle 1',
    lengthM: 220,
    features: ['OL', 'Grube'],
    state: 'frei',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.0140, 48.8235],
        [10.0160, 48.8235]
      ]
    }
  },
  {
    id: 'E-H2',
    depot: 'Essingen',
    type: 'Halle',
    name: 'Halle 2',
    lengthM: 220,
    features: ['OL', 'Lathe'],
    state: 'belegt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.0140, 48.8232],
        [10.0160, 48.8232]
      ]
    }
  },
  {
    id: 'E-ARA1',
    depot: 'Essingen',
    type: 'ARA',
    name: 'ARA 1',
    lengthM: 180,
    features: ['Shore'],
    state: 'frei',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.0140, 48.8229],
        [10.0158, 48.8229]
      ]
    }
  },
  {
    id: 'E-ST1',
    depot: 'Essingen',
    type: 'Yard',
    name: 'Stellgleis 1',
    lengthM: 300,
    features: [],
    state: 'belegt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.0135, 48.8226],
        [10.0165, 48.8226]
      ]
    }
  },

  // === LANGWEID TRACKS ===
  // Hallen
  {
    id: 'L-H1',
    depot: 'Langweid',
    type: 'Halle',
    name: 'Halle 1',
    lengthM: 250,
    features: ['OL', 'Grube', 'Wash'],
    state: 'belegt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8450, 48.4495],
        [10.8475, 48.4495]
      ]
    }
  },
  {
    id: 'L-H2',
    depot: 'Langweid',
    type: 'Halle',
    name: 'Halle 2',
    lengthM: 250,
    features: ['OL', 'Lathe'],
    state: 'frei',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8450, 48.4492],
        [10.8475, 48.4492]
      ]
    }
  },
  {
    id: 'L-H3',
    depot: 'Langweid',
    type: 'Halle',
    name: 'Halle 3',
    lengthM: 220,
    features: ['OL', 'Grube'],
    state: 'belegt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8450, 48.4489],
        [10.8472, 48.4489]
      ]
    }
  },
  {
    id: 'L-H4',
    depot: 'Langweid',
    type: 'Halle',
    name: 'Halle 4',
    lengthM: 220,
    features: ['OL'],
    state: 'frei',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8450, 48.4486],
        [10.8472, 48.4486]
      ]
    }
  },
  {
    id: 'L-H5',
    depot: 'Langweid',
    type: 'Halle',
    name: 'Halle 5',
    lengthM: 180,
    features: ['Shore'],
    state: 'belegt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8450, 48.4483],
        [10.8468, 48.4483]
      ]
    }
  },
  // Phase 2 Hallen (optional)
  {
    id: 'L-H6',
    depot: 'Langweid',
    type: 'Halle',
    name: 'Halle 6 (Phase 2)',
    lengthM: 250,
    features: ['OL', 'Grube'],
    state: 'gesperrt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8478, 48.4495],
        [10.8503, 48.4495]
      ]
    }
  },
  {
    id: 'L-H7',
    depot: 'Langweid',
    type: 'Halle',
    name: 'Halle 7 (Phase 2)',
    lengthM: 250,
    features: ['OL', 'Lathe'],
    state: 'gesperrt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8478, 48.4492],
        [10.8503, 48.4492]
      ]
    }
  },
  {
    id: 'L-H8',
    depot: 'Langweid',
    type: 'Halle',
    name: 'Halle 8 (Phase 2)',
    lengthM: 220,
    features: ['OL'],
    state: 'gesperrt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8478, 48.4489],
        [10.8500, 48.4489]
      ]
    }
  },
  // Stellgleise
  {
    id: 'L-ST1',
    depot: 'Langweid',
    type: 'Yard',
    name: 'Stellgleis 1',
    lengthM: 400,
    features: [],
    state: 'belegt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8445, 48.4478],
        [10.8485, 48.4478]
      ]
    }
  },
  {
    id: 'L-ST2',
    depot: 'Langweid',
    type: 'Yard',
    name: 'Stellgleis 2',
    lengthM: 400,
    features: [],
    state: 'frei',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8445, 48.4475],
        [10.8485, 48.4475]
      ]
    }
  },
  {
    id: 'L-ST3',
    depot: 'Langweid',
    type: 'Yard',
    name: 'Stellgleis 3',
    lengthM: 350,
    features: [],
    state: 'belegt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8445, 48.4472],
        [10.8480, 48.4472]
      ]
    }
  },
  {
    id: 'L-ST4',
    depot: 'Langweid',
    type: 'Yard',
    name: 'Stellgleis 4',
    lengthM: 350,
    features: [],
    state: 'frei',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8445, 48.4469],
        [10.8480, 48.4469]
      ]
    }
  },
  {
    id: 'L-ST5',
    depot: 'Langweid',
    type: 'Yard',
    name: 'Stellgleis 5',
    lengthM: 300,
    features: [],
    state: 'belegt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8445, 48.4466],
        [10.8475, 48.4466]
      ]
    }
  },
  {
    id: 'L-ST6',
    depot: 'Langweid',
    type: 'Yard',
    name: 'Stellgleis 6',
    lengthM: 300,
    features: [],
    state: 'defekt',
    geometry: {
      type: 'LineString',
      coordinates: [
        [10.8445, 48.4463],
        [10.8475, 48.4463]
      ]
    }
  }
];

// Helper function to get depot center
export function getDepotCenter(depot: 'Essingen' | 'Langweid'): [number, number] {
  return depot === 'Essingen' 
    ? [essingenBase.lat, essingenBase.lng]
    : [langweidBase.lat, langweidBase.lng];
}

// Helper function to get track color based on state
export function getTrackColor(state: TrackGeometry['state']): string {
  switch (state) {
    case 'frei': return '#10b981'; // green
    case 'belegt': return '#eab308'; // yellow
    case 'gesperrt': return '#ef4444'; // red
    case 'defekt': return '#6b7280'; // gray
    default: return '#9ca3af';
  }
}
