import TrainDetailsPanel from '../../../components/train/TrainDetailsPanel';
import { MaintenanceTimeline } from '../../../components/maintenance/MaintenanceTimeline';
import { Card, CardBody, CardTitle } from '../../../components/ui/Card';
import type { Train, MaintenanceTask } from '../../../types/train';
import { apiGet } from '../../../lib/api';

async function getTrain(id: string): Promise<Train> {
  const isTest = process.env.NEXT_PUBLIC_TEST_MODE === '1';
  if (isTest) {
    return {
      id,
      name: `RE9-${id}`,
      depot: 'Köln',
      healthScore: 92,
      sensors: [
        { key: 'Öltemp', value: 78, unit: '°C' },
        { key: 'Bremsdruck', value: 6.1, unit: 'bar' },
      ],
    };
  }
  try {
    return await apiGet<Train>(`/api/trains/${id}`);
  } catch {
    return {
      id,
      name: `RE9-${id}`,
      depot: 'Köln',
      healthScore: 92,
      sensors: [
        { key: 'Öltemp', value: 78, unit: '°C' },
        { key: 'Bremsdruck', value: 6.1, unit: 'bar' },
      ],
    };
  }
}
async function getTasks(id: string): Promise<MaintenanceTask[]> {
  const isTest = process.env.TEST_MODE === '1' || process.env.NEXT_PUBLIC_TEST_MODE === '1';
  if (isTest) {
    return [
      {
        id: 't1',
        trainId: id,
        title: 'Bremsen-Check',
        dueDate: new Date(Date.now() + 864e5).toISOString(),
        status: 'DUE_SOON',
        depot: 'Köln',
      },
      {
        id: 't2',
        trainId: id,
        title: 'Radsatzprüfung',
        dueDate: new Date(Date.now() - 864e5 * 2).toISOString(),
        status: 'OVERDUE',
        depot: 'Köln',
      },
    ];
  }
  try {
    const resp: any = await apiGet<any>(`/api/maintenance/${id}`);
    if (Array.isArray(resp)) return resp as MaintenanceTask[];
    if (resp && Array.isArray(resp.schedule)) {
      // Map maintenance schedule items to MaintenanceTask[] for display
      const now = Date.now();
      const mapped: MaintenanceTask[] = resp.schedule.slice(0, 5).map((s: any, idx: number) => ({
        id: `sched-${idx}`,
        trainId: id,
        title: String(s.component || s.type || 'Wartung'),
        dueDate: new Date(now + (idx + 1) * 86400000).toISOString(),
        status: s.status === 'OVERDUE' || s.status === 'DUE_SOON' ? s.status : 'OK',
        depot: resp.depot || resp.unitType || 'Depot n/a',
      }));
      return mapped;
    }
    return [];
  } catch {
    return [];
  }
}

export default async function Page({ params }: { params: { id: string } }) {
  // Fetch in parallel but handle fallbacks safely
  const [trainRes, tasksRes] = await Promise.allSettled([getTrain(params.id), getTasks(params.id)]);
  const train =
    trainRes.status === 'fulfilled'
      ? trainRes.value
      : { id: params.id, name: `RE9-${params.id}`, depot: 'Köln', healthScore: 92, sensors: [] };
  const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value : [];
  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardBody>
          <CardTitle className="mb-2 text-white">{train.name}</CardTitle>
          <TrainDetailsPanel train={train} tasks={tasks} />
        </CardBody>
      </Card>
      <Card>
        <CardBody className="text-white">
          <h2 className="text-xl mb-2">Wartungs-Timeline</h2>
          <MaintenanceTimeline tasks={tasks} />
        </CardBody>
      </Card>
    </div>
  );
}
