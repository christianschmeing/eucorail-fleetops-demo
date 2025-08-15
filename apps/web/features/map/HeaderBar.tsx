"use client";
import { KPIStat } from '@/components/KPIStat';

export function HeaderBar({ faults }: { faults: number }) {
  return (
    <header className="bg-black/30 border-b border-white/10 px-6 py-4" data-testid="header-bar">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-euco-accent rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">E</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Eucorail FleetOps</h1>
            <p className="text-sm text-euco-muted">Live-Map & Train-Tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <KPIStat label="Verfügbarkeit" value="97.2%" trend="up" data-testid="kpi-availability" />
          <KPIStat label="Ø Verspätung" value="+2.8 min" trend="down" data-testid="kpi-delay" />
          <KPIStat label="Störungen aktiv" value={`${faults}`} trend="flat" data-testid="kpi-faults" />
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-euco-accent2 rounded-full animate-pulse"></div>
            <span className="text-sm text-euco-accent2">Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}


