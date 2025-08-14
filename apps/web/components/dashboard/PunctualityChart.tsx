"use client";
import { useEffect, useMemo, useState } from 'react';

type Stat = { onTime: number; delayed: number; canceled: number };

export default function PunctualityChart() {
  const isTest = process.env.NEXT_PUBLIC_TEST_MODE === '1';
  const [stat, setStat] = useState<Stat>({ onTime: 85, delayed: 12, canceled: 3 });

  useEffect(() => {
    if (isTest) return; // keep deterministic in tests
    const id = setInterval(() => {
      const onTime = Math.max(50, Math.min(98, Math.round(80 + (Math.random() * 20 - 10))));
      const delayed = Math.max(0, Math.min(40, Math.round(100 - onTime - Math.random() * 8)));
      const canceled = Math.max(0, 100 - onTime - delayed);
      setStat({ onTime, delayed, canceled });
    }, 5000);
    return () => clearInterval(id);
  }, [isTest]);

  const bars = useMemo(() => ([
    { label: 'On time', value: stat.onTime, color: 'bg-green-400' },
    { label: 'Delayed', value: stat.delayed, color: 'bg-yellow-400' },
    { label: 'Canceled', value: stat.canceled, color: 'bg-red-400' }
  ]), [stat]);

  return (
    <div className="bg-[#1A2F3A] border border-[#2A3F4A] rounded-lg p-4" data-testid="widget-punctuality">
      <h3 className="text-sm font-semibold mb-3">Pünktlichkeit</h3>
      <div className="space-y-2">
        {bars.map(b => (
          <div key={b.label} className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-300">{b.label}</span>
              <span className="text-gray-400">{b.value}%</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded">
              <div className={`h-2 ${b.color} rounded`} style={{ width: `${b.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


