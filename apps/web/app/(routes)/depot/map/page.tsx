import { Metadata } from 'next';
import ServerDepotMap from './ServerDepotMap';
import dynamic from 'next/dynamic';
import { generateAllocations, generateMovePlans, getKPIs } from '../depot-data';
import { trackGeometries } from '../track-geometries';

export const metadata: Metadata = {
  title: 'Depot Karte | EUCORAIL FleetOps',
  description: 'Depot-Mikrosicht mit Track-Belegung und Zu-/Abführungsplanung',
};

async function getDepotMapData() {
  // Generate initial allocations and move plans
  const allocations = generateAllocations();
  // Merge planned allocations from API with robust SSR-safe fetch
  try {
    const baseEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || '';
    const fullUrl = baseEnv
      ? `${baseEnv.startsWith('http') ? '' : 'https://'}${baseEnv}/api/depot/allocations`
      : `${process.env.NODE_ENV === 'production' ? 'https://geolocation-mockup.vercel.app' : ''}/api/depot/allocations`;
    const r = await fetch(fullUrl, { cache: 'no-store' });
    if (r.ok) {
      const json = await r.json();
      if (Array.isArray(json?.planned)) {
        allocations.push(
          ...json.planned.map((p: any) => ({
            id: p.id,
            train_id: p.train_id,
            line_code: p.line_code || 'DEPOT',
            trackId: p.trackId,
            startPlanned: new Date(p.startPlanned),
            endPlanned: new Date(p.endPlanned),
            etaRelease: new Date(p.etaRelease || p.endPlanned),
            purpose: p.purpose,
            risk: p.risk || 'low',
            status: (p.status as any) || 'planned',
            is_reserve: !!p.is_reserve,
            lengthM: p.lengthM || 180,
            offsetM: p.offsetM || 10,
            home_depot: p.home_depot,
          }))
        );
      }
    }
  } catch (err) {
    console.error('Failed to load planned allocations', err);
  }

  const movePlans = generateMovePlans();
  const kpis = getKPIs(allocations);

  return {
    tracks: trackGeometries,
    allocations,
    movePlans,
    kpis,
  };
}

export default async function DepotMapPage({
  searchParams,
}: {
  searchParams?: { depot?: string };
}) {
  const data = await getDepotMapData();

  // Support deep-linking via ?depot=Langweid
  const selectedDepot: 'Essingen' | 'Langweid' =
    searchParams?.depot === 'Langweid' ? 'Langweid' : 'Essingen';

  const tracksForDepot = data.tracks.filter((t) => t.depot === selectedDepot);
  const allocationsForDepot = data.allocations.filter((a) => {
    const track = data.tracks.find((t) => t.id === a.trackId);
    return track?.depot === selectedDepot;
  });

  // Attempt to populate more precise rails via Overpass (server-side fetch, cached by Next)
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/railmaps/depot?depot=${selectedDepot}`,
      { next: { revalidate: 60 * 60 * 24 } }
    );
    if (r.ok) {
      const fc = await r.json();
      if (fc?.features?.length) {
        // map first few ways to our track lines when ids match loosely
        // This keeps SSR simple; client can enhance further later
        const lines = fc.features.slice(0, 6).map((f: any, idx: number) => ({
          id: `osm-${idx}`,
          depot: selectedDepot,
          type: 'Yard',
          name: `Gleis ${idx + 1}`,
          lengthM: 180,
          features: [],
          state: idx % 2 === 0 ? 'belegt' : 'frei',
          geometry: {
            type: 'LineString',
            coordinates: f.geometry.coordinates as [number, number][],
          },
        }));
        if (lines.length) {
          tracksForDepot.splice(0, tracksForDepot.length, ...(lines as any));
        }
      }
    }
  } catch {}

  const DepotMapGL = dynamic(() => import('./DepotMapGL'), { ssr: false });

  // Render server-side summary header + client MapLibre for tracks
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900 to-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Depot-Karte</h1>
            {/* Depot Switcher */}
            <div className="flex items-center gap-2">
              <a
                href="/depot/map?depot=Essingen"
                className={`px-3 py-1 rounded border ${selectedDepot === 'Essingen' ? 'bg-white/10 border-white/30' : 'border-white/20 hover:bg-white/5'}`}
              >
                Essingen
              </a>
              <a
                href="/depot/map?depot=Langweid"
                className={`px-3 py-1 rounded border ${selectedDepot === 'Langweid' ? 'bg-white/10 border-white/30' : 'border-white/20 hover:bg-white/5'}`}
              >
                Langweid
              </a>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-400">Züge im Depot</div>
              <div className="text-xl font-bold text-white">
                {allocationsForDepot.length}/{data.kpis.fleetSize}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Gleis-Auslastung</div>
              <div className="text-xl font-bold text-yellow-400">{data.kpis.utilizationPct}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Map - Server rendered */}
      <div className="flex-1 relative">
        <DepotMapGL
          depot={selectedDepot}
          tracks={tracksForDepot as any}
          allocations={allocationsForDepot as any}
        />
      </div>
    </div>
  );
}
