'use client';

import { useState, useEffect } from 'react';
import { Train, Activity, Users, AlertTriangle } from 'lucide-react';

interface SimpleHeaderProps {
  faults?: number;
}

export function SimpleHeader({ faults = 0 }: SimpleHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-6 py-4" data-testid="header-bar">
      <div className="flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Train className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">EucoRail FleetOps</h1>
              <p className="text-xs text-gray-400">Live Fleet Management System</p>
            </div>
          </div>
        </div>

        {/* Center Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-xs text-gray-400">System</p>
              <p className="text-sm font-medium text-green-400">Online</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <div>
              <p className="text-xs text-gray-400">Züge</p>
              <p className="text-sm font-medium text-blue-400">30 Aktiv</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${faults > 0 ? 'text-red-400' : 'text-gray-400'}`} />
            <div>
              <p className="text-xs text-gray-400">Störungen</p>
              <p className={`text-sm font-medium ${faults > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {faults > 0 ? `${faults} Aktiv` : 'Keine'}
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Time */}
        <div className="text-right">
          <time className="text-sm font-medium text-white" suppressHydrationWarning>
            {currentTime.toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </time>
          <time className="text-xs text-gray-400" suppressHydrationWarning>
            {currentTime.toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </time>
        </div>
      </div>
    </header>
  );
}
