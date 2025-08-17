'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Train, AlertCircle, CheckCircle, Wrench, ChevronRight, Activity, TrendingUp } from 'lucide-react';

interface ModernSidebarProps {
  trains: any[];
  activeLines: string[];
  setActiveLines: (lines: string[]) => void;
  selectedTrain: string | null;
  onSelect: (id: string) => void;
}

export function ModernSidebar({ trains = [], activeLines, setActiveLines, selectedTrain, onSelect }: ModernSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [hoveredTrain, setHoveredTrain] = useState<string | null>(null);

  // Glassmorphism Effekt
  const glassStyle = "bg-black/20 backdrop-blur-xl border border-white/10";
  const cardHoverStyle = "hover:bg-white/5 hover:border-white/20 hover:scale-[1.02] hover:shadow-2xl";
  
  // Status-Farben mit Neon-Glow
  const statusColors = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.5)]",
    standby: "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.5)]",
    maintenance: "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
  };

  const statusIcons = {
    active: <Activity className="w-4 h-4" />,
    standby: <AlertCircle className="w-4 h-4" />,
    maintenance: <Wrench className="w-4 h-4" />
  };

  // Filter trains
  const filteredTrains = trains.filter(train => {
    const matchesSearch = !searchQuery || 
      train.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      train.lineId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus.length === 0 || 
      selectedStatus.includes(train.status);
    
    const matchesLine = activeLines.length === 0 || 
      activeLines.includes(train.lineId);
    
    return matchesSearch && matchesStatus && matchesLine;
  });

  // Gruppiere nach Linien
  const groupedTrains = filteredTrains.reduce((acc, train) => {
    const line = train.lineId || 'Unknown';
    if (!acc[line]) acc[line] = [];
    acc[line].push(train);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <aside className={`w-96 ${glassStyle} h-full overflow-hidden flex flex-col`}>
      {/* Header mit Gradient */}
      <div className="p-6 border-b border-white/10 bg-gradient-to-br from-blue-600/20 to-purple-600/20">
        <h1 className="text-2xl font-bold text-white mb-1">Fleet Control</h1>
        <p className="text-white/60 text-sm">{trains.length} Züge im System</p>
        
        {/* Moderne Suchleiste */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suche nach Zug-ID oder Linie..."
            className={`w-full pl-10 pr-4 py-3 ${glassStyle} rounded-xl text-white placeholder-white/40 
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300`}
          />
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="p-4 border-b border-white/10">
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusColors).map(([status, colorClass]) => (
            <button
              key={status}
              onClick={() => {
                setSelectedStatus(prev => 
                  prev.includes(status) 
                    ? prev.filter(s => s !== status)
                    : [...prev, status]
                );
              }}
              className={`px-4 py-2 rounded-full border transition-all duration-300 flex items-center gap-2
                ${selectedStatus.includes(status) 
                  ? colorClass 
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
            >
              {statusIcons[status as keyof typeof statusIcons]}
              <span className="capitalize font-medium">{status}</span>
              <span className="text-xs opacity-60">
                ({trains.filter(t => t.status === status).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Züge Liste mit Animation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(Object.entries(groupedTrains) as Array<[string, any[]]>).map(([line, lineTrains]) => (
          <div key={line} className="space-y-2">
            {/* Linien-Header */}
            <div className="flex items-center justify-between px-3 py-1">
              <h3 className="text-white/80 font-semibold flex items-center gap-2">
                <Train className="w-4 h-4" />
                {line}
              </h3>
              <span className="text-xs text-white/40">{lineTrains.length} Züge</span>
            </div>
            
            {/* Züge Cards */}
            {lineTrains.map((train) => (
              <div
                key={train.id}
                onClick={() => onSelect(train.id)}
                onMouseEnter={() => setHoveredTrain(train.id)}
                onMouseLeave={() => setHoveredTrain(null)}
                className={`${glassStyle} p-4 rounded-xl cursor-pointer transition-all duration-300 
                  ${cardHoverStyle} ${selectedTrain === train.id ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Zug ID mit moderner Typografie */}
                    <h4 className="text-white font-bold text-lg mb-1">{train.id}</h4>
                    
                    {/* Status Badge mit Glow-Effekt */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border 
                        ${statusColors[train.status as keyof typeof statusColors]}`}>
                        {statusIcons[train.status as keyof typeof statusIcons]}
                        <span className="ml-1">{train.status}</span>
                      </span>
                      {train.speed > 0 && (
                        <span className="text-xs text-blue-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {train.speed} km/h
                        </span>
                      )}
                    </div>
                    
                    {/* Zusätzliche Info */}
                    <div className="text-xs text-white/50 space-y-1">
                      {train.nextStop && (
                        <p>Nächster Halt: <span className="text-white/70">{train.nextStop}</span></p>
                      )}
                      {train.delay !== undefined && train.delay !== 0 && (
                        <p className={train.delay > 0 ? 'text-red-400' : 'text-green-400'}>
                          {train.delay > 0 ? '+' : ''}{train.delay} min
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Animated Arrow */}
                  <ChevronRight className={`w-5 h-5 text-white/30 transition-all duration-300
                    ${hoveredTrain === train.id ? 'translate-x-1 text-white/60' : ''}`} />
                </div>
                
                {/* Progress Bar für Health Score */}
                {train.healthScore && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/50">System Health</span>
                      <span className={`font-medium ${
                        train.healthScore > 90 ? 'text-green-400' : 
                        train.healthScore > 70 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{train.healthScore}%</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          train.healthScore > 90 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                          train.healthScore > 70 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                          'bg-gradient-to-r from-red-400 to-red-600'
                        }`}
                        style={{ width: `${train.healthScore}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Footer Stats */}
      <div className={`p-4 border-t border-white/10 ${glassStyle}`}>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-400">
              {trains.filter(t => t.status === 'active').length}
            </p>
            <p className="text-xs text-white/50">Aktiv</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">
              {trains.filter(t => t.status === 'standby').length}
            </p>
            <p className="text-xs text-white/50">Standby</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">
              {trains.filter(t => t.status === 'maintenance').length}
            </p>
            <p className="text-xs text-white/50">Wartung</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
