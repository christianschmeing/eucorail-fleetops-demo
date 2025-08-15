"use client";
import { Dispatch, SetStateAction } from 'react';

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
  return (
    <aside className="w-80 bg-black/30 border-r border-white/10 overflow-y-auto" data-testid="sidebar">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Zugliste</h2>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button className="bg-black/30 hover:bg-white/10 px-3 py-2 rounded-xl text-sm transition-colors">Alle Züge</button>
          <button className="bg-black/30 hover:bg-white/10 px-3 py-2 rounded-xl text-sm transition-colors">Nur Aktiv</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {['RE9','RE8','MEX16'].map(code => (
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
          {[
            { id: 'RE9-78001', name: 'RE9 78001', status: 'maintenance', speed: 0 },
            { id: 'RE9-78002', name: 'RE9 78002', status: 'active', speed: 85 },
            { id: 'RE8-79021', name: 'RE8 79021', status: 'active', speed: 92 },
            { id: 'RE8-79022', name: 'RE8 79022', status: 'active', speed: 78 },
            { id: 'MEX16-66011', name: 'MEX16 66011', status: 'active', speed: 95 },
            { id: 'MEX16-66012', name: 'MEX16 66012', status: 'inspection', speed: 0 },
            { id: 'BY-12345', name: 'BY 12345', status: 'stationary', speed: 0 },
            { id: 'BW-67890', name: 'BW 67890', status: 'stationary', speed: 0 }
          ].map(train => (
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
                  <div className="font-medium">{train.name}</div>
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
                    aria-label={`Details anzeigen für ${train.name}`}
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


