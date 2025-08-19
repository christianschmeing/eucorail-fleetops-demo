import TrainDetailClient from './TrainDetailClient';
import { notFound } from 'next/navigation';

async function getTrain(id: string) {
  try {
    // Import the API route handler and call it directly
    const apiModule = await import('@/app/api/trains/route');
    const response = await apiModule.GET(new Request('http://localhost/api/trains'));
    const trains = await response.json();
    
    const train = trains.find((t: any) => t.id === id || t.trainId === id);
    
    if (!train) {
      console.error('Train not found:', id);
      return null;
    }
    
    return train;
  } catch (error) {
    console.error('Error getting train:', error);
    return null;
  }
}

// Generate static params for known train IDs (optional for dynamic routes)
export async function generateStaticParams() {
  return [];  // Return empty array to allow all dynamic paths
}

export default async function TrainDetailPage({ params }: { params: { id: string } }) {
  const decodedId = decodeURIComponent(params.id);
  const train = await getTrain(decodedId);
  
  if (!train) {
    notFound();
  }
  
  return <TrainDetailClient train={train} />;
}
