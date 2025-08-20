import { Metadata } from 'next';
import ServerDepotMap from './ServerDepotMap';
import { generateAllocations, generateMovePlans, getKPIs } from '../depot-data';
import { trackGeometries } from '../track-geometries';

export const metadata: Metadata = {
  title: 'Depot Karte | EUCORAIL FleetOps',
  description: 'Depot-Mikrosicht mit Track-Belegung und Zu-/Abführungsplanung',
};

async function getDepotMapData() {
  // Generate initial allocations and move plans
  const allocations = generateAllocations();
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

  // Render server-side map directly; ensure default depot shows tracks
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900 to-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Depot-Karte</h1>
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
        <ServerDepotMap
          depot={selectedDepot}
          tracks={tracksForDepot}
          allocations={allocationsForDepot}
        />
      </div>
    </div>
  );
}
