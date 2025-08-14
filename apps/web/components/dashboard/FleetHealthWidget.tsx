"use client";
import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function FleetHealthWidget() {
  const qc = useQueryClient();
  const stats = useMemo(() => {
    const fc = qc.getQueryData<any>(['trains', 'live']);
    const features = Array.isArray(fc?.features) ? fc.features : [];
    const totals = { total: 0, active: 0, maintenance: 0, inspection: 0, stationary: 0 } as Record<string, number>;
    for (const f of features) {
      totals.total++;
      const status = String(f?.properties?.status ?? 'active');
      if (totals[status] == null) totals[status] = 0;
      totals[status]++;
    }
    return totals;
  }, [qc]);

  return (
    <div className="bg-[#1A2F3A] border border-[#2A3F4A] rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">Fleet Health</h3>
      <div className="grid grid-cols-4 gap-3 text-center">
        <Stat label="Total" value={stats.total} color="text-white" />
        <Stat label="Active" value={stats.active} color="text-green-400" />
        <Stat label="Maint." value={stats.maintenance} color="text-yellow-400" />
        <Stat label="Inspect." value={stats.inspection} color="text-red-400" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}


