import type { Metadata } from 'next';
import { ArverioLiveMap } from '@/features/map/ArverioLiveMap';

export const metadata: Metadata = {
  title: 'Arverio Live-Karte | EUCORAIL FleetOps',
  description: 'Live-Karte mit echten Arverio-Linien und Fahrzeugen',
};

export default function Page() {
  return (
    <div className="h-screen bg-gray-900">
      <div className="p-4 border-b border-gray-800 bg-gray-900">
        <h1 className="text-white text-2xl font-bold">Arverio Live-Karte</h1>
        <p className="text-gray-400 text-sm">
          RE1, RE8, RE90 (BW) · RE9 (BY) · Depots Essingen & Langweid
        </p>
      </div>
      <div className="h-[calc(100vh-72px)]">
        <ArverioLiveMap />
      </div>
    </div>
  );
}
