"use client";
import { useMemo } from 'react';

export default function PerformanceKPIs() {
  const kpis = useMemo(() => ([
    { label: 'MTBF (h)', value: 428 },
    { label: 'MTTR (h)', value: 2.4 },
    { label: 'Avail (%)', value: 96.2 }
  ]), []);

  return (
    <div className="bg-[#1A2F3A] border border-[#2A3F4A] rounded-lg p-4" data-testid="widget-kpis">
      <h3 className="text-sm font-semibold mb-3">Performance KPIs</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        {kpis.map(k => (
          <div key={k.label}>
            <div className="text-xl font-bold">{k.value}</div>
            <div className="text-xs text-gray-400">{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


