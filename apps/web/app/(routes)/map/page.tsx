"use client";
import dynamic from 'next/dynamic';

const MapShell = dynamic(() => import("@/components/MapShell"), { ssr: false });

export default function MapPage() {
  return (
    <div className="h-full">
      {/* hide MapShell header to avoid double header with AppNav */}
      <MapShell showSidebar={false} showHeader={false} />
    </div>
  );
}


