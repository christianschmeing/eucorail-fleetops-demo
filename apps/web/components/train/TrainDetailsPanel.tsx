'use client';
import { useState } from 'react';
import type { Train, MaintenanceTask } from '../../types/train';

export default function TrainDetailsPanel({
  train, tasks
}: { train: Train; tasks: MaintenanceTask[] }) {
  const [tab, setTab] = useState<'technik'|'wartung'|'zustand'>('technik');

  return (
    <div className="rounded-xl p-4 bg-euco-bg/70 text-white" data-testid="train-details-panel">
      <div className="flex gap-2 mb-3" role="tablist" aria-label="Train tabs">
        {(['technik','wartung','zustand'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            role="tab"
            aria-selected={tab===t}
            className={`px-3 py-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-euco-accent ${tab===t?'bg-euco-accent text-black':'bg-black/30'}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab==='technik' && (
        <div className="grid grid-cols-2 gap-3">
          {(train.sensors ?? []).map(s => (
            <div key={s.key} className="bg-black/30 rounded-xl p-3">
              <div className="text-sm text-euco-muted">{s.key}</div>
              <div className="text-xl">{String(s.value)}{s.unit?` ${s.unit}`:''}</div>
            </div>
          ))}
        </div>
      )}

      {tab==='wartung' && (
        <ul className="space-y-2">
          {tasks.map(t => (
            <li key={t.id} className="bg-black/30 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-sm text-euco-muted">{t.depot ?? '–'} • fällig {new Date(t.dueDate).toLocaleDateString()}</div>
              </div>
              <span className={`px-2 py-1 rounded-xl text-sm ${
                t.status==='OVERDUE' ? 'bg-euco-danger' :
                t.status==='DUE_SOON' ? 'bg-euco-warn' : 'bg-euco-accent text-black'
              }`}>{t.status}</span>
            </li>
          ))}
        </ul>
      )}

      {tab==='zustand' && (
        <div className="flex items-center gap-3">
          <div className="text-sm text-euco-muted">Health</div>
          <div className="text-2xl">{train.healthScore ?? 100}%</div>
        </div>
      )}
    </div>
  );
}


