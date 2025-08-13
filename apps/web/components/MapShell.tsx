"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map } from "maplibre-gl";
import { TrainMarkers } from "./TrainMarkers";

export default function MapShell() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [10.0, 48.6],
      zoom: 7,
      attributionControl: true
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Mark ready as soon as map instance exists; layers/tiles may stream in
    setReady(true);
    const onIdle = () => setReady(true);
    const onError = () => setReady(true);
    map.on("idle", onIdle);
    map.on("error", onError);
    mapRef.current = map;
    return () => {
      map.off("idle", onIdle);
      map.off("error", onError);
      map.remove();
    };
  }, []);

  return (
    <div className="grid grid-cols-[360px_1fr_420px] grid-rows-[56px_1fr_28px] h-screen w-screen">
      <header className="col-span-3 row-span-1 flex items-center px-4 bg-[#0B1F2A]/80 backdrop-blur border-b border-white/10">
        <div className="font-semibold tracking-wide">Eucorail FleetOps Demo</div>
        <div className="ml-3 text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30">Demo</div>
        <div className="ml-auto text-xs text-white/60">Simulierte Daten – nicht operativ</div>
      </header>
      <aside className="row-start-2 col-start-1 col-end-2 border-r border-white/10 bg-[#0B1F2A] overflow-auto p-3">
        <div className="text-sm mb-2 font-medium">Suche</div>
        <input className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Zugnummer…" />
        <div className="mt-4 text-sm mb-2 font-medium">Filter</div>
        <div className="flex gap-2 flex-wrap">
          <button className="px-2 py-1 text-xs rounded border border-white/10 hover:border-white/20">BY</button>
          <button className="px-2 py-1 text-xs rounded border border-white/10 hover:border-white/20">BW</button>
          <button className="px-2 py-1 text-xs rounded border border-white/10 hover:border-white/20">RE9</button>
          <button className="px-2 py-1 text-xs rounded border border-white/10 hover:border-white/20">MEX16</button>
          <button className="px-2 py-1 text-xs rounded border border-white/10 hover:border-white/20">RE8</button>
        </div>
      </aside>
      <main className="row-start-2 col-start-2 col-end-3 relative">
        <div ref={mapContainerRef} className="absolute inset-0" data-testid="map-canvas" />
        {ready && <TrainMarkers map={mapRef.current} />}
      </main>
      <section className="row-start-2 col-start-3 col-end-4 border-l border-white/10 bg-[#0B1F2A] overflow-auto p-3">
        <div className="text-sm font-medium mb-3">Details</div>
        {!ready && <div className="text-xs text-white/60">Karte lädt…</div>}
        {ready && <div className="text-xs text-white/60">Bereit für Linien, Züge und Fleet-Health…</div>}
      </section>
      <footer className="col-span-3 row-start-3 text-[11px] text-white/60 px-3 flex items-center border-t border-white/10">
        Simulierte Positions- und Zustandsdaten – keine operativen Informationen
      </footer>
    </div>
  );
}

