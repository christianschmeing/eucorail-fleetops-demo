"use client";
import { Dispatch, SetStateAction, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function Sidebar({
  activeLines,
  setActiveLines,
  isTestMode,
  selectedTrain,
  onSelect
}: {
  activeLines: string[];
  setActiveLines: Dispatch<SetStateAction<string[]>>;
  isTestMode: boolean;
  selectedTrain: string | null;
  onSelect: (id: string) => void;
}) {
  const qc = useQueryClient();
  const trains = useMemo(() => {
    const fc = qc.getQueryData<any>(['trains', 'live']);
    const features = Array.isArray(fc?.features) ? fc.features : [];
    const list = features.map((f: any) => ({
      id: String(f?.properties?.id ?? ''),
      line: String(f?.properties?.line ?? ''),
      status: String(f?.properties?.status ?? 'active'),
      speed: Number(f?.properties?.speed ?? 0)
    })).filter((t: any) => t.id);
    list.sort((a: any, b: any) => a.id.localeCompare(b.id));
    return list as Array<{ id: string; line: string; status: string; speed: number }>;
  }, [qc]);

  const lineChips = useMemo(() => {
    const set = new Set<string>();
    for (const t of trains) if (t.line) set.add(t.line);
    // Fallback defaults
    if (set.size === 0) ['RE9','RE8','MEX16','BY','BW'].forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [trains]);

  return (
    <aside className="w-80 bg-black/30 border-r border-white/10 overflow-y-auto" data-testid="sidebar">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Zugliste</h2>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button className="bg-black/30 hover:bg-white/10 px-3 py-2 rounded-xl text-sm transition-colors">Alle Züge</button>
          <button className="bg-black/30 hover:bg-white/10 px-3 py-2 rounded-xl text-sm transition-colors">Nur Aktiv</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {lineChips.map(code => (
            <button
              key={code}
              className={`${activeLines.includes(code) ? 'bg-euco-accent text-black' : 'bg-black/30 hover:bg-white/10'} px-3 py-1 rounded-xl text-xs transition-colors`}
              onClick={() => setActiveLines(prev => prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code])}
            >
              {code}
            </button>
          ))}
        </div>
        <div className="space-y-2" data-testid="train-list">
          {(trains.length > 0 ? trains : [
            { id: 'RE9-78001', line: 'RE9', status: 'maintenance', speed: 0 },
            { id: 'RE9-78002', line: 'RE9', status: 'active', speed: 85 },
            { id: 'RE9-78003', line: 'RE9', status: 'active', speed: 80 },
            { id: 'RE8-79021', line: 'RE8', status: 'active', speed: 92 },
            { id: 'RE8-79022', line: 'RE8', status: 'active', speed: 78 },
            { id: 'RE8-79023', line: 'RE8', status: 'active', speed: 76 },
            { id: 'RE8-79024', line: 'RE8', status: 'active', speed: 74 },
            { id: 'MEX16-66011', line: 'MEX16', status: 'active', speed: 95 },
            { id: 'MEX16-66012', line: 'MEX16', status: 'inspection', speed: 0 },
            { id: 'MEX16-66013', line: 'MEX16', status: 'active', speed: 88 },
            { id: 'BY-12345', line: 'BY', status: 'stationary', speed: 0 },
            { id: 'BW-67890', line: 'BW', status: 'stationary', speed: 0 }
          ]).filter(t => activeLines.length === 0 || activeLines.includes(t.line)).map(train => (
            <div
              key={train.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedTrain === train.id ? 'bg-euco-accent text-black' : 'bg-black/30 hover:bg-white/10'
              }`}
              data-testid="train-item"
              onClick={() => onSelect(train.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{train.id}</div>
                  <div className="text-xs opacity-75">
                    {train.status === 'active' ? `${train.speed} km/h` : train.status}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  train.status === 'active' ? 'bg-green-400' :
                  train.status === 'maintenance' ? 'bg-yellow-400' :
                  train.status === 'inspection' ? 'bg-red-400' :
                  'bg-gray-400'
                }`}></div>
              </div>
              {isTestMode && (
                <div className="mt-2">
                  <button
                    type="button"
                    data-testid="open-details"
                    className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20"
                    onClick={(e) => { e.stopPropagation(); onSelect(train.id); }}
                    aria-label={`Details anzeigen für ${train.id}`}
                  >
                    Details anzeigen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}


