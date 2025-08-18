'use client';
import { useEffect, useState } from 'react';

type Weather = { condition: string; temperatureC: number; windSpeedKmh: number };

export default function WeatherPanel() {
  const isTest = process.env.NEXT_PUBLIC_TEST_MODE === '1';
  const [w, setW] = useState<Weather>({ condition: 'sunny', temperatureC: 20, windSpeedKmh: 10 });

  useEffect(() => {
    if (isTest) return;
    const id = setInterval(() => {
      const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'foggy'];
      setW({
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        temperatureC: Math.round((Math.random() * 35 - 5) * 10) / 10,
        windSpeedKmh: Math.round(Math.random() * 60),
      });
    }, 7000);
    return () => clearInterval(id);
  }, [isTest]);

  return (
    <div
      className="bg-[#1A2F3A] border border-[#2A3F4A] rounded-lg p-4"
      data-testid="widget-weather"
    >
      <h3 className="text-sm font-semibold mb-3">Wetter</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xl font-bold">{w.condition}</div>
          <div className="text-xs text-gray-400">Zustand</div>
        </div>
        <div>
          <div className="text-xl font-bold">{w.temperatureC}°C</div>
          <div className="text-xs text-gray-400">Temperatur</div>
        </div>
        <div>
          <div className="text-xl font-bold">{w.windSpeedKmh} km/h</div>
          <div className="text-xs text-gray-400">Wind</div>
        </div>
      </div>
    </div>
  );
}
