import linesData from '@/data/lines-complete.json';
import { NextResponse } from 'next/server';

type LatLng = { lat: number; lon?: number; lng?: number };

function bboxForLine(id: string) {
  const groups: any[] = [
    ...(((linesData as any).baden_wuerttemberg as any[]) ?? []),
    ...(((linesData as any).bayern as any[]) ?? []),
  ];
  const g = groups.find((x) => x?.id === id);
  const stations: LatLng[] = (g?.stations as any[]) ?? [];
  if (!stations.length) return null;
  let minLat = 90,
    maxLat = -90,
    minLng = 180,
    maxLng = -180;
  for (const s of stations) {
    const lat = s.lat;
    const lng = (s as any).lng ?? s.lon ?? 0;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  // small padding to ensure we capture curves around stations
  const pad = 0.2;
  return { south: minLat - pad, west: minLng - pad, north: maxLat + pad, east: maxLng + pad };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const bb = bboxForLine(id);
    if (!bb) return NextResponse.json({ type: 'FeatureCollection', features: [] });
    const overpass = `data=[out:json][timeout:25];(way[railway=rail](${bb.south},${bb.west},${bb.north},${bb.east}););out geom;`;
    const url = `https://overpass-api.de/api/interpreter?${overpass}`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const json = await res.json();
    const features = (json.elements || [])
      .filter((e: any) => e.type === 'way' && Array.isArray(e.geometry))
      .map((e: any) => ({
        type: 'Feature',
        properties: { id: e.id },
        geometry: {
          type: 'LineString',
          coordinates: e.geometry.map((g: any) => [g.lon, g.lat]),
        },
      }));
    return new NextResponse(JSON.stringify({ type: 'FeatureCollection', features }), {
      headers: {
        'content-type': 'application/json',
        'cache-control': 's-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (err: any) {
    return new NextResponse(
      JSON.stringify({
        type: 'FeatureCollection',
        features: [],
        error: String(err?.message || err),
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
