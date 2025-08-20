import dynamic from 'next/dynamic';
import type { TrackGeometry } from '../track-geometries';
import type { Allocation } from '../depot-data';

interface ServerDepotMapProps {
  depot: 'Essingen' | 'Langweid';
  tracks: TrackGeometry[];
  allocations: Allocation[];
}

const LeafletDepotMap = dynamic(() => import('./LeafletDepotMap'), { ssr: false });

export default function ServerDepotMap({ depot, tracks, allocations }: ServerDepotMapProps) {
  return <LeafletDepotMap depot={depot} tracks={tracks} allocations={allocations} />;
}
