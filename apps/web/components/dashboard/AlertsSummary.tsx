'use client';
import { useMemo } from 'react';

type Counts = { info: number; warning: number; error: number; critical: number };

export default function AlertsSummary() {
  const counts = useMemo<Counts>(() => {
    // Placeholder random stats
    return {
      info: 12,
      warning: 5,
      error: 2,
      critical: 0,
    };
  }, []);

  return (
    <div className="bg-[#1A2F3A] border border-[#2A3F4A] rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">Alerts Summary</h3>
      <div className="grid grid-cols-4 gap-3 text-center">
        <AlertTile label="Info" value={counts.info} color="text-blue-300" />
        <AlertTile label="Warning" value={counts.warning} color="text-yellow-300" />
        <AlertTile label="Error" value={counts.error} color="text-red-400" />
        <AlertTile label="Critical" value={counts.critical} color="text-red-500" />
      </div>
    </div>
  );
}

function AlertTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
