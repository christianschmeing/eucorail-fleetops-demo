import React from 'react';
import type { Allocation } from '../depot-data';
import type { TrackGeometry } from '../track-geometries';

interface Props {
  track: TrackGeometry | null;
  allocation: Allocation | null;
  allocations: Allocation[];
  conflicts: Array<{
    id: string;
    type: string;
    description: string;
    trackId: string;
    severity: string;
  }>;
  onClose: () => void;
  onConflictClick?: (conflict: any) => void;
}

export default function DepotMapInspector({
  track,
  allocation,
  allocations,
  conflicts,
  onClose,
  onConflictClick,
}: Props) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-200 font-semibold">Inspector</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-gray-200">
        {track && (
          <div className="bg-gray-900 border border-gray-700 rounded p-3">
            <div className="font-semibold">
              {track.name} ({track.id})
            </div>
            <div className="text-xs text-gray-400">
              Typ: {track.type} • Länge: {track.lengthM}m • Status: {track.state}
            </div>
            <div className="text-xs text-gray-400">
              Features: {track.features.join(', ') || '–'}
            </div>
            <div className="mt-2 text-sm font-semibold">Belegung</div>
            <ul className="text-xs list-disc pl-4">
              {allocations
                .filter((a) => a.trackId === track.id)
                .map((a) => (
                  <li key={a.id}>
                    {a.train_id} • {a.purpose} • {a.startPlanned.toLocaleTimeString('de-DE')}–
                    {a.endPlanned.toLocaleTimeString('de-DE')}
                  </li>
                ))}
              {allocations.filter((a) => a.trackId === track.id).length === 0 && (
                <li>Keine Belegung auf diesem Gleis im Zeitraum.</li>
              )}
            </ul>
          </div>
        )}

        {allocation && (
          <div className="bg-gray-900 border border-gray-700 rounded p-3">
            <div className="font-semibold">{allocation.train_id}</div>
            <div className="text-xs text-gray-400">
              Linie: {allocation.line_code} • IS: {allocation.purpose} • Risiko: {allocation.risk}
            </div>
            <div className="text-xs text-gray-400">
              Start–Ende: {allocation.startPlanned.toLocaleString('de-DE')} –{' '}
              {allocation.endPlanned.toLocaleString('de-DE')}
            </div>
            <div className="text-xs text-gray-400">
              ETA frei: {allocation.etaRelease.toLocaleString('de-DE')}
            </div>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded p-3">
            <div className="font-semibold mb-2">Konflikte</div>
            <ul className="text-xs list-disc pl-4">
              {conflicts.map((c) => (
                <li key={c.id}>
                  <button
                    className="underline hover:text-gray-100"
                    onClick={() => onConflictClick?.(c)}
                  >
                    [{c.severity}] {c.type}: {c.description}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
