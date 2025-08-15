import TrainDetailsPanel from '../../../components/train/TrainDetailsPanel';
import { MaintenanceTimeline } from '../../../components/maintenance/MaintenanceTimeline';
import type { Train, MaintenanceTask } from '../../../types/train';

async function getTrain(id: string): Promise<Train> {
  // TODO: echte API; hier Mock
  return { id, name: `RE9-${id}`, depot: 'Köln', healthScore: 92,
    sensors: [{ key: 'Öltemp', value: 78, unit: '°C' }, { key: 'Bremsdruck', value: 6.1, unit: 'bar' }]
  };
}
async function getTasks(id: string): Promise<MaintenanceTask[]> {
  return [
    { id:'t1', trainId:id, title:'Bremsen-Check', dueDate:new Date(Date.now()+864e5).toISOString(), status:'DUE_SOON', depot:'Köln' },
    { id:'t2', trainId:id, title:'Radsatzprüfung', dueDate:new Date(Date.now()-864e5*2).toISOString(), status:'OVERDUE', depot:'Köln' }
  ];
}

export default async function Page({ params }: { params: { id: string }}) {
  const [train, tasks] = await Promise.all([getTrain(params.id), getTasks(params.id)]);
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl text-white">{train.name}</h1>
      <TrainDetailsPanel train={train} tasks={tasks} />
      <section className="bg-black/30 rounded-xl p-4 text-white">
        <h2 className="text-xl mb-2">Wartungs-Timeline</h2>
        <MaintenanceTimeline tasks={tasks} />
      </section>
    </div>
  );
}


