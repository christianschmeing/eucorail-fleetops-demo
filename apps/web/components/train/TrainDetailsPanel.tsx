'use client';
import { useState } from 'react';
import type { Train, MaintenanceTask } from '@/types/train';
import { Tabs } from '@/components/ui/Tabs';
import { StatusChip } from '@/components/ui/StatusChip';

export default function TrainDetailsPanel({
  train, tasks
}: { train: Train; tasks: MaintenanceTask[] }) {
  const [tab, setTab] = useState<'technik'|'wartung'|'zustand'>('technik');

  return (
    <div className="rounded-xl p-4 bg-euco-bg/70 text-white" data-testid="train-details-panel">
      <div className="mb-3">
        <Tabs
          tabs={[
            { key: 'technik', label: 'TECHNIK' },
            { key: 'wartung', label: 'WARTUNG' },
            { key: 'zustand', label: 'ZUSTAND' }
          ]}
          active={tab}
          onChange={(k) => setTab(k as typeof tab)}
        />
      </div>

      {tab==='technik' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(train.sensors ?? []).map(s => (
              <div key={s.key} className="bg-black/30 rounded-xl p-3">
                <div className="text-sm text-euco-muted">{s.key}</div>
                <div className="text-xl">{String(s.value)}{s.unit?` ${s.unit}`:''}</div>
              </div>
            ))}
          </div>
          <details className="bg-black/30 rounded-xl p-3">
            <summary className="cursor-pointer">Subsystem‑Historie</summary>
            <ul className="mt-2 text-sm list-disc pl-5">
              <li>ETCS Reset – 2h zuvor</li>
              <li>Türen: Sensor‑Kalibrierung – gestern</li>
              <li>Klima‑Filter gewechselt – vor 3 Tagen</li>
            </ul>
          </details>
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
        <div className="flex items-center gap-4">
          <div className="text-sm text-euco-muted">Health</div>
          <div className="text-2xl">{train.healthScore ?? 100}%</div>
          <StatusChip status={(train.healthScore ?? 100) < 60 ? 'CRIT' : (train.healthScore ?? 100) < 85 ? 'WARN' : 'OK'} />
        </div>
      )}
    </div>
  );
}


