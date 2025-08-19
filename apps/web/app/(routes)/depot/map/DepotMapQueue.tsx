import React from 'react';
import type { MovePlan } from '../depot-data';

interface Props {
  movePlans: MovePlan[];
  onDrop?: (trainId: string, trackId: string) => void;
}

export default function DepotMapQueue({ movePlans }: Props) {
  return (
    <div className="p-3 space-y-2" data-testid="queue">
      <div className="text-sm text-gray-300 font-semibold">Zu-/Abführung</div>
      {movePlans.map((p) => (
        <div
          key={p.id}
          className="bg-gray-900 border border-gray-700 rounded p-2 text-gray-200"
          draggable
          onDragStart={(e) => {
            e.dataTransfer?.setData('application/json', JSON.stringify({ trainId: p.train_id }));
          }}
        >
          <div className="flex justify-between items-center">
            <div className="font-mono text-xs">{p.train_id}</div>
            <div className="text-xs text-gray-400">{p.type}</div>
          </div>
          <div className="text-xs text-gray-400">
            {new Date(p.slot.start).toLocaleTimeString('de-DE')} –{' '}
            {new Date(p.slot.end).toLocaleTimeString('de-DE')}
          </div>
        </div>
      ))}
    </div>
  );
}
