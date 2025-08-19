import { apiGet } from '@/lib/api';
import TrainDetailClient from './TrainDetailClient';
import { notFound } from 'next/navigation';

async function getTrain(id: string) {
  try {
    const trains = await apiGet<any[]>('/api/trains');
    const train = trains.find(t => t.id === id);
    if (!train) {
      return null;
    }
    return train;
  } catch {
    return null;
  }
}

export default async function TrainDetailPage({ params }: { params: { id: string } }) {
  const train = await getTrain(params.id);
  
  if (!train) {
    notFound();
  }
  
  return <TrainDetailClient train={train} />;
}
