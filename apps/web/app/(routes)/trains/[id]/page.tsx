import TrainDetailClient from './TrainDetailClient';
import { notFound } from 'next/navigation';

async function getTrain(id: string) {
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    
    const res = await fetch(`${baseUrl}/api/trains`, {
      cache: 'no-store'
    });
    
    if (!res.ok) {
      console.error('Failed to fetch trains:', res.status);
      return null;
    }
    
    const trains = await res.json();
    const train = trains.find((t: any) => t.id === id || t.trainId === id);
    
    if (!train) {
      console.error('Train not found:', id);
      return null;
    }
    
    return train;
  } catch (error) {
    console.error('Error fetching train:', error);
    return null;
  }
}

export default async function TrainDetailPage({ params }: { params: { id: string } }) {
  const decodedId = decodeURIComponent(params.id);
  const train = await getTrain(decodedId);
  
  if (!train) {
    notFound();
  }
  
  return <TrainDetailClient train={train} />;
}
