'use client';
import { useMemo } from 'react';

export default function PassengerFlow() {
  const data = useMemo(
    () => [
      { label: 'Boarding', value: 120 },
      { label: 'Alighting', value: 95 },
      { label: 'Onboard', value: 680 },
    ],
    []
  );

  return (
    <div
      className="bg-[#1A2F3A] border border-[#2A3F4A] rounded-lg p-4"
      data-testid="widget-passenger-flow"
    >
      <h3 className="text-sm font-semibold mb-3">Passenger Flow</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        {data.map((item) => (
          <div key={item.label}>
            <div className="text-xl font-bold text-white">{item.value}</div>
            <div className="text-xs text-gray-400">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
