import type { Track } from '@/types/depot';

export async function loadDepotTracks(depot: 'Essingen' | 'Langweid'): Promise<Track[]> {
  try {
    const res = await fetch(`/api/railmaps/depot?depot=${depot}`, { cache: 'force-cache' });
    if (res.ok) {
      const fc = await res.json();
      if (fc?.features?.length) {
        return (fc.features as any[]).map((f, idx) => toTrackFromFeature(f, depot, idx));
      }
    }
  } catch {}
  // fallback to static geojson if available
  try {
    const staticRes = await fetch(`/data/depots/${depot.toLowerCase()}_tracks.geojson`, {
      cache: 'force-cache',
    });
    if (staticRes.ok) {
      const fc = await staticRes.json();
      return (fc.features as any[]).map((f: any, idx: number) => toTrackFromFeature(f, depot, idx));
    }
  } catch {}
  return [];
}

function toTrackFromFeature(f: any, depot: string, idx: number): Track {
  const id = f.properties?.id ? String(f.properties.id) : `trk-${idx}`;
  const type = (f.properties?.type || 'yard') as Track['type'];
  const geom = f.geometry as GeoJSON.LineString;
  let length = 0;
  if (geom && Array.isArray(geom.coordinates)) {
    const coords = (geom.coordinates as unknown as number[][])
      .filter((c) => Array.isArray(c) && c.length >= 2)
      .map((c) => [c[0], c[1]] as [number, number]);
    length = estimateLength(coords);
    // normalize geometry to 2D tuples for downstream consumers
    (geom as any).coordinates = coords;
  }
  return {
    id,
    depot_id: depot,
    type,
    geometry: geom,
    length,
    positions: [],
    connected_to: [],
  };
}

function estimateLength(coords: [number, number][]): number {
  let m = 0;
  for (let i = 1; i < coords.length; i++) {
    m += haversine(coords[i - 1], coords[i]);
  }
  return Math.round(m);
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}
