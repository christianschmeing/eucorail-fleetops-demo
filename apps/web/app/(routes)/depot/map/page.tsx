import { Metadata } from 'next';
import DepotMapClient from './DepotMapClient';
import { generateAllocations, generateMovePlans, getKPIs } from '../depot-data';
import { trackGeometries } from '../track-geometries';

export const metadata: Metadata = {
  title: 'Depot Karte | EUCORAIL FleetOps',
  description: 'Depot-Mikrosicht mit Track-Belegung und Zu-/Abführungsplanung'
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
    kpis
  };
}

export default async function DepotMapPage() {
  const data = await getDepotMapData();
  
  return <DepotMapClient {...data} />;
}
