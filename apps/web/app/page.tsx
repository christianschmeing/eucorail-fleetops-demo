"use client";

import dynamic from "next/dynamic";

const MapShell = dynamic(() => import("../components/MapShell"), { ssr: false });

export default function HomePage() {
  return <MapShell />;
}

