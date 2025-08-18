'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
// import { HeaderBar } from "@/features/map/HeaderBar";
// import { Sidebar } from "@/features/map/Sidebar";
import { ModernHeader } from '@/components/modern/ModernHeader';
import { ModernSidebar } from '@/components/modern/ModernSidebar';
import { Sidebar as LegacySidebar } from '@/features/map/Sidebar';

const MapShell = dynamic(() => import('../components/MapShell'), { ssr: false });

export default function HomePage() {
  const [activeLines, setActiveLines] = useState<string[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<string | null>(null);
  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === '1';

  // Reflect selection coming from MapShell (which dispatches 'selected:train')
  useEffect(() => {
    const onSelected = (e: any) => setSelectedTrain(e?.detail ?? null);
    window.addEventListener('selected:train', onSelected as any);
    return () => window.removeEventListener('selected:train', onSelected as any);
  }, []);

  const handleSelect = (id: string) => {
    setSelectedTrain(id);
    try {
      (window as any).setSelectedTrain?.(id);
    } catch {}
  };

  // Fetch trains data
  const [trains, setTrains] = useState<any[]>([]);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';
    fetch(`${apiBase}/api/trains?limit=50`)
      .then((res) => res.json())
      .then((data) => setTrains(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to fetch trains:', err));
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-950 text-white overflow-hidden">
      <ModernHeader faults={1} />
      <div className="flex h-[calc(100vh-80px)]" style={{ display: 'flex' }}>
        {isTestMode ? (
          <LegacySidebar
            activeLines={activeLines}
            setActiveLines={setActiveLines}
            isTestMode={true}
            selectedTrain={selectedTrain}
            onSelect={handleSelect}
          />
        ) : (
          <ModernSidebar
            trains={trains}
            activeLines={activeLines}
            setActiveLines={setActiveLines}
            selectedTrain={selectedTrain}
            onSelect={handleSelect}
          />
        )}
        <div className="flex-1 relative">
          <MapShell
            externalActiveLines={activeLines}
            showSidebar={false}
            showDetails={true}
            showHeader={false}
          />
          {/* Gradient Overlay for smoother blend */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute top-0 left-0 h-full w-32 bg-gradient-to-r from-black/50 to-transparent" />
            <div className="absolute top-0 right-0 h-full w-32 bg-gradient-to-l from-black/50 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
