'use client';
import type { MaintenanceTask } from '../../types/train';

export function MaintenanceTimeline({ tasks }: { tasks: MaintenanceTask[] }) {
  const byDate = [...tasks].sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  return (
    <ol className="relative border-l border-white/20 pl-4" data-testid="maintenance-timeline">
      {byDate.map(t=>{
        const dotColor = t.status==='OVERDUE' ? 'bg-euco-danger' : t.status==='DUE_SOON' ? 'bg-euco-warn' : 'bg-euco-accent';
        return (
          <li key={t.id} className="mb-4">
            <div className={`absolute -left-1.5 w-3 h-3 rounded-full ${dotColor}`} aria-hidden="true"></div>
            <div className="text-sm text-euco-muted">{new Date(t.dueDate).toLocaleString()}</div>
            <div className="font-medium">{t.title}</div>
            <div className="text-sm">{t.depot ?? 'Depot n/a'}</div>
          </li>
        );
      })}
    </ol>
  );
}


