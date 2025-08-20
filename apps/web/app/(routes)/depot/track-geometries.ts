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
// align with depot_tracks_korrekt.yaml Essingen location
const essingenBase = { lat: 48.6295, lng: 9.9574 };

// Langweid depot tracks - centered at [10.846, 48.449]
// align with depot_tracks_korrekt.yaml Langweid location
const langweidBase = { lat: 48.4894, lng: 10.8539 };

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
        [9.9564, 48.6298],
        [9.9584, 48.6298],
      ],
    },
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
        [9.9564, 48.6295],
        [9.9584, 48.6295],
      ],
    },
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
        [9.9564, 48.6292],
        [9.9582, 48.6292],
      ],
    },
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
        [9.956, 48.6289],
        [9.959, 48.6289],
      ],
    },
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
        [10.8525, 48.4896],
        [10.855, 48.4896],
      ],
    },
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
        [10.8525, 48.4893],
        [10.855, 48.4893],
      ],
    },
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
        [10.8525, 48.489],
        [10.8547, 48.489],
      ],
    },
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
        [10.8525, 48.4887],
        [10.8547, 48.4887],
      ],
    },
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
        [10.8525, 48.4884],
        [10.8543, 48.4884],
      ],
    },
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
        [10.8553, 48.4896],
        [10.8578, 48.4896],
      ],
    },
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
        [10.8553, 48.4893],
        [10.8578, 48.4893],
      ],
    },
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
        [10.8553, 48.489],
        [10.8575, 48.489],
      ],
    },
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
        [10.852, 48.4879],
        [10.856, 48.4879],
      ],
    },
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
        [10.852, 48.4876],
        [10.856, 48.4876],
      ],
    },
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
        [10.852, 48.4873],
        [10.8555, 48.4873],
      ],
    },
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
        [10.852, 48.487],
        [10.8555, 48.487],
      ],
    },
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
        [10.852, 48.4867],
        [10.855, 48.4867],
      ],
    },
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
        [10.852, 48.4864],
        [10.855, 48.4864],
      ],
    },
  },
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
    case 'frei':
      return '#10b981'; // green
    case 'belegt':
      return '#eab308'; // yellow
    case 'gesperrt':
      return '#ef4444'; // red
    case 'defekt':
      return '#6b7280'; // gray
    default:
      return '#9ca3af';
  }
}
