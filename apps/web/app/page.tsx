"use client";

import dynamic from "next/dynamic";
import { HeaderBar } from "@/features/map/HeaderBar";
import { Sidebar } from "@/features/map/Sidebar";

const MapShell = dynamic(() => import("../components/MapShell"), { ssr: false });

export default function HomePage() {
  return (
    <div className="h-screen w-screen bg-euco-bg text-white overflow-hidden">
      <HeaderBar faults={1} />
      <div className="flex h-[calc(100vh-80px)]">
        {/* Leave MapShell to render map and overlays; Sidebar duplicated here for structure in future split */}
        <Sidebar activeLines={[]} setActiveLines={() => {}} isTestMode={true} selectedTrain={null} onSelect={() => {}} />
        <div className="flex-1">
          <MapShell />
        </div>
      </div>
    </div>
  );
}

