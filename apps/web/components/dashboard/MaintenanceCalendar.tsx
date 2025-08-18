'use client';
import { useMemo } from 'react';

type Day = { date: string; hasService: boolean };

export default function MaintenanceCalendar() {
  const days = useMemo<Day[]>(() => {
    const today = new Date();
    const res: Day[] = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      const hasService = i % 5 === 0 || i % 7 === 0;
      res.push({ date: d.toISOString().slice(0, 10), hasService });
    }
    return res;
  }, []);

  return (
    <div className="bg-[#1A2F3A] border border-[#2A3F4A] rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">Maintenance Calendar</h3>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => (
          <div
            key={d.date}
            className={`p-2 rounded text-center text-xs ${d.hasService ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5 border border-white/10'}`}
          >
            <div>{d.date.slice(5)}</div>
            {d.hasService && <div className="text-yellow-300 mt-1">Service</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
