'use client';

import { useMemo } from 'react';

interface Track {
  id: string;
  name: string;
  depot: string;
  length: number;
  features: string[];
  status: string;
}

interface Allocation {
  id: string;
  trackId: string;
  trainId: string;
  lineId: string;
  isLevel: 'IS1' | 'IS2' | 'IS3' | 'IS4';
  tasks: string[];
  startTime: string;
  endTime: string;
  etaRelease: string;
  status: 'Geplant' | 'Zugewiesen' | 'In Arbeit' | 'QA' | 'Freigegeben';
  team?: string;
  shift?: string;
  hasConflict?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
  isReserve?: boolean;
  homeDepot?: string;
}

interface GanttChartProps {
  tracks: Track[];
  allocations: Allocation[];
  timeScale: 'today' | '3days' | '7days' | '14days';
  onAllocationClick: (allocation: Allocation) => void;
  selectedAllocation: Allocation | null;
}

export default function GanttChart({
  tracks,
  allocations,
  timeScale,
  onAllocationClick,
  selectedAllocation
}: GanttChartProps) {
  // Berechne Zeitbereich
  const { startTime, endTime, hours } = useMemo(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    
    let end = new Date(now);
    let hoursCount = 24;
    
    if (timeScale === 'today') {
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      hoursCount = 24;
    } else if (timeScale === '3days') {
      end = new Date(now);
      end.setDate(end.getDate() + 3);
      hoursCount = 72;
    } else if (timeScale === '7days') {
      end = new Date(now);
      end.setDate(end.getDate() + 7);
      hoursCount = 168;
    } else {
      end = new Date(now);
      end.setDate(end.getDate() + 14);
      hoursCount = 336;
    }
    
    return { startTime: now, endTime: end, hours: hoursCount };
  }, [timeScale]);

  // Generiere Stunden-Headers
  const hourHeaders = useMemo(() => {
    const headers = [];
    const current = new Date(startTime);
    
    for (let i = 0; i < hours; i++) {
      const hour = current.getHours();
      const isNewDay = hour === 0;
      
      headers.push({
        time: new Date(current),
        label: hour.toString().padStart(2, '0'),
        isNewDay,
        dayLabel: isNewDay ? current.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' }) : null
      });
      
      current.setHours(current.getHours() + 1);
    }
    
    return headers;
  }, [startTime, hours]);

  // Berechne Position und Breite für Allocation
  const calculatePosition = (allocation: Allocation) => {
    const allocStart = new Date(allocation.startTime);
    const allocEnd = new Date(allocation.endTime);
    
    // Clamp to visible range
    const visibleStart = Math.max(allocStart.getTime(), startTime.getTime());
    const visibleEnd = Math.min(allocEnd.getTime(), endTime.getTime());
    
    if (visibleEnd <= visibleStart) return null;
    
    const totalMs = endTime.getTime() - startTime.getTime();
    const left = ((visibleStart - startTime.getTime()) / totalMs) * 100;
    const width = ((visibleEnd - visibleStart) / totalMs) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  // IS-Level Farben
  const getISColor = (level: string) => {
    switch(level) {
      case 'IS1': return 'bg-blue-600';
      case 'IS2': return 'bg-green-600';
      case 'IS3': return 'bg-yellow-600';
      case 'IS4': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  // Status Farben
  const getStatusBorder = (status: string) => {
    switch(status) {
      case 'In Arbeit': return 'border-green-400 border-2';
      case 'QA': return 'border-yellow-400 border-2';
      case 'Zugewiesen': return 'border-blue-400 border-2';
      case 'Freigegeben': return 'border-gray-400 border-2';
      default: return 'border-gray-600';
    }
  };

  return (
    <div className="h-full bg-gray-900 text-white">
      {/* Zeit-Header */}
      <div className="sticky top-0 z-20 bg-gray-800 border-b border-gray-700">
        <div className="flex">
          <div className="w-32 p-2 border-r border-gray-700 text-sm font-medium">
            Gleis
          </div>
          <div className="flex-1 relative">
            <div className="flex">
              {hourHeaders.map((header, i) => (
                <div 
                  key={i} 
                  className={`flex-1 text-center text-xs py-1 border-r border-gray-700 ${
                    header.isNewDay ? 'bg-gray-700' : ''
                  }`}
                  style={{ minWidth: timeScale === '7days' ? '20px' : '40px' }}
                >
                  {header.isNewDay && header.dayLabel && (
                    <div className="font-medium text-yellow-400">{header.dayLabel}</div>
                  )}
                  <div className={header.isNewDay ? 'text-yellow-400' : 'text-gray-400'}>
                    {header.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Rows */}
      <div className="overflow-y-auto">
        {tracks.map(track => {
          const trackAllocations = allocations.filter(a => a.trackId === track.id);
          
          return (
            <div key={track.id} className="flex border-b border-gray-700 hover:bg-gray-800/50">
              <div className="w-32 p-3 border-r border-gray-700">
                <div className="font-medium text-sm">{track.name}</div>
                <div className="text-xs text-gray-400">{track.length}m</div>
              </div>
              
              <div className="flex-1 relative h-20">
                {/* Stunden-Grid */}
                <div className="absolute inset-0 flex">
                  {hourHeaders.map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 border-r border-gray-700/30"
                      style={{ minWidth: timeScale === '7days' ? '20px' : '40px' }}
                    />
                  ))}
                </div>
                
                {/* Allocations */}
                {trackAllocations.map(allocation => {
                  const position = calculatePosition(allocation);
                  if (!position) return null;
                  
                  const isSelected = selectedAllocation?.id === allocation.id;
                  const etaTime = new Date(allocation.etaRelease);
                  const etaFormatted = etaTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div
                      key={allocation.id}
                      className={`absolute top-2 bottom-2 ${getISColor(allocation.isLevel)} ${getStatusBorder(allocation.status)} 
                        rounded cursor-pointer hover:opacity-90 transition-all ${
                        isSelected ? 'ring-2 ring-white z-10' : ''
                      } ${allocation.hasConflict ? 'animate-pulse' : ''}`}
                      style={position}
                      onClick={() => onAllocationClick(allocation)}
                    >
                      <div className="p-1 h-full flex flex-col justify-between overflow-hidden">
                        <div>
                          <div className="text-xs font-bold truncate flex items-center gap-1">
                            {allocation.trainId}
                            {allocation.isReserve && (
                              <span className="text-purple-400 text-xs">(R)</span>
                            )}
                          </div>
                          <div className="text-xs opacity-80 truncate">
                            {allocation.tasks.slice(0, 2).join(', ')}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs bg-black/30 px-1 rounded">
                            {allocation.isLevel}
                          </span>
                          <span className={`text-xs px-1 rounded ${
                            allocation.riskLevel === 'high' ? 'bg-red-500 text-white' : 
                            allocation.riskLevel === 'medium' ? 'bg-yellow-500 text-black' : 
                            'bg-green-500 text-white'
                          }`}>
                            {etaFormatted}
                          </span>
                        </div>
                      </div>
                      {allocation.hasConflict && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legende */}
      <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-2 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">IS-Stufen:</span>
          <span className="px-2 py-1 bg-blue-600 rounded">IS1</span>
          <span className="px-2 py-1 bg-green-600 rounded">IS2</span>
          <span className="px-2 py-1 bg-yellow-600 rounded">IS3</span>
          <span className="px-2 py-1 bg-purple-600 rounded">IS4</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Status:</span>
          <span className="px-2 py-1 border-2 border-green-400 rounded">In Arbeit</span>
          <span className="px-2 py-1 border-2 border-yellow-400 rounded">QA</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">ETA-Risiko:</span>
          <span className="px-2 py-1 bg-red-500 rounded">Hoch</span>
          <span className="px-2 py-1 bg-yellow-500 text-black rounded">Mittel</span>
          <span className="px-2 py-1 bg-green-500 rounded">Niedrig</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Reserve:</span>
          <span className="px-2 py-1 bg-purple-600 rounded">(R)</span>
        </div>
      </div>
    </div>
  );
}
