'use client';

import { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Bell,
  Settings,
  User,
  Moon,
  Sun,
  Activity,
  Zap,
  Users,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface ModernHeaderProps {
  faults?: number;
}

export function ModernHeader({ faults = 0 }: ModernHeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  const [notifications, setNotifications] = useState(3);

  useEffect(() => {
    setIsClient(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Glassmorphism styling
  const glassStyle = 'bg-black/20 backdrop-blur-xl border-b border-white/10';

  // Live Status Indicators
  const statusIndicators = [
    { icon: Activity, label: 'System', status: 'online', color: 'text-emerald-400' },
    { icon: Zap, label: 'API', status: 'connected', color: 'text-blue-400' },
    { icon: Users, label: '247 Active', status: 'users', color: 'text-purple-400' },
  ];

  // KPI Cards
  const kpiData = [
    {
      label: 'Pünktlichkeit',
      value: '97.2%',
      trend: '+2.3%',
      color: 'from-emerald-400 to-emerald-600',
      icon: CheckCircle,
    },
    {
      label: 'Auslastung',
      value: '84.5%',
      trend: '-1.2%',
      color: 'from-blue-400 to-blue-600',
      icon: Users,
    },
    {
      label: 'Energie',
      value: '412 kW',
      trend: '-8.2%',
      color: 'from-amber-400 to-amber-600',
      icon: Zap,
    },
    {
      label: 'Störungen',
      value: faults.toString(),
      trend: faults > 0 ? 'Aktiv' : 'Keine',
      color: faults > 0 ? 'from-red-400 to-red-600' : 'from-gray-400 to-gray-600',
      icon: AlertTriangle,
    },
  ];

  return (
    <header className={`${glassStyle} px-6 py-4`} data-testid="header-bar">
      <div className="flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              {/* Live Pulse Animation */}
              <div className="absolute -top-1 -right-1 w-3 h-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Eucorail FleetOps</h1>
              <p className="text-xs text-white/50">Live Flottenmanagement</p>
            </div>
          </div>

          {/* Live Status Indicators */}
          <div className="flex items-center gap-4 pl-6 border-l border-white/10">
            {statusIndicators.map((indicator, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <indicator.icon className={`w-4 h-4 ${indicator.color}`} />
                <div>
                  <p className="text-xs text-white/50">{indicator.label}</p>
                  <p className={`text-xs font-medium ${indicator.color}`}>{indicator.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="flex items-center gap-3">
          {kpiData.map((kpi, idx) => (
            <div
              key={idx}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 
                hover:bg-white/10 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${kpi.color} bg-opacity-20`}>
                  <kpi.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">{kpi.label}</p>
                  <p className="text-lg font-bold text-white">{kpi.value}</p>
                  <p
                    className={`text-xs ${
                      kpi.trend.startsWith('+')
                        ? 'text-emerald-400'
                        : kpi.trend.startsWith('-')
                          ? 'text-red-400'
                          : 'text-white/50'
                    }`}
                  >
                    {kpi.trend}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Time Display (avoid hydration mismatch) */}
          <div className="text-right px-4 border-r border-white/10">
            <time className="text-sm font-medium text-white" suppressHydrationWarning>
              {isClient
                ? currentTime.toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '–:–:–'}
            </time>
            <time className="text-xs text-white/50" suppressHydrationWarning>
              {isClient
                ? currentTime.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </time>
          </div>

          {/* Connection Status */}
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5 text-white/70" />
            {notifications > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                text-xs text-white flex items-center justify-center font-bold"
              >
                {notifications}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isDarkMode ? (
              <Moon className="w-5 h-5 text-white/70" />
            ) : (
              <Sun className="w-5 h-5 text-white/70" />
            )}
          </button>

          {/* Settings */}
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Settings className="w-5 h-5 text-white/70" />
          </button>

          {/* User Profile */}
          <button className="flex items-center gap-2 p-2 px-3 rounded-lg hover:bg-white/10 transition-colors">
            <div
              className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full 
              flex items-center justify-center"
            >
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-white/70">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
}
