import { NextResponse } from 'next/server';
import { getDepotCenter } from '@/app/(routes)/depot/track-geometries';

function bboxForDepot(depot: 'Essingen' | 'Langweid') {
  const [lat, lon] = getDepotCenter(depot).map((v: number) => v) as [number, number];
  // tight bbox around depot area
  const dy = 0.002;
  const dx = 0.004;
  return { south: lat - dy, west: lon - dx, north: lat + dy, east: lon + dx };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const depotParam = (searchParams.get('depot') || 'Essingen').toLowerCase();
  const depot = depotParam.startsWith('l') ? 'Langweid' : 'Essingen';

  try {
    const bb = bboxForDepot(depot as 'Essingen' | 'Langweid');
    // fetch rails + sidings + yard tracks around depot
    const overpass = `data=[out:json][timeout:25];(way[railway~"^(rail|siding|yard|service)$"](${bb.south},${bb.west},${bb.north},${bb.east});>;out geom;`;
    const url = `https://overpass-api.de/api/interpreter?${overpass}`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const json = await res.json();
    const features = (json.elements || [])
      .filter((e: any) => e.type === 'way' && Array.isArray(e.geometry))
      .map((e: any) => ({
        type: 'Feature',
        properties: { id: e.id, railway: e.tags?.railway, name: e.tags?.name },
        geometry: { type: 'LineString', coordinates: e.geometry.map((g: any) => [g.lon, g.lat]) },
      }));
    return NextResponse.json(
      { type: 'FeatureCollection', features },
      {
        headers: { 'cache-control': 's-maxage=86400, stale-while-revalidate=43200' },
      }
    );
  } catch (err: any) {
    return NextResponse.json({
      type: 'FeatureCollection',
      features: [],
      error: String(err?.message || err),
    });
  }
}
