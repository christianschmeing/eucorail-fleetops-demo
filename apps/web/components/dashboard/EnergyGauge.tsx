"use client";
import { useEffect, useState } from 'react';

export default function EnergyGauge() {
  const [consumption, setConsumption] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setConsumption((c) => Math.round((c + Math.random() * 2) % 100)), 1500);
    return () => clearInterval(id);
  }, []);

  const pct = consumption;

  return (
    <div className="bg-[#1A2F3A] border border-[#2A3F4A] rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">Energy Consumption</h3>
      <div className="h-3 w-full bg-white/10 rounded">
        <div className="h-3 bg-green-400 rounded" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-xs text-gray-300">{pct}% of budget</div>
    </div>
  );
}


