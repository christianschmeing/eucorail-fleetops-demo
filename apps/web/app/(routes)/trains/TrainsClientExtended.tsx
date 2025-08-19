'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MaintenanceInfo, MaintenanceInterval } from '@/types/train';

interface Train {
  id: string;
  lineId: string;
  region: string;
  status: string;
  depot: string;
  series?: string;
  delayMin?: number;
  speedKmh?: number;
  healthScore?: number;
  nextMaintenanceDate?: string;
  maintenanceInfo?: MaintenanceInfo;
  [key: string]: any;
}

interface TrainsClientProps {
  initialTrains: Train[];
}

// Helper für Ampel-Status
function getStatusBadge(status: 'green' | 'yellow' | 'red') {
  if (status === 'green') return 'bg-green-500/20 text-green-400';
  if (status === 'yellow') return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
}

// Maintenance Badge Komponente
function MaintenanceBadge({ 
  type, 
  interval 
}: { 
  type: string; 
  interval?: MaintenanceInterval 
}) {
  if (!interval) return <span className="text-gray-500">-</span>;
  
  return (
    <div className="group relative">
      <div className={`px-2 py-1 rounded text-xs ${getStatusBadge(interval.status)} cursor-help`}>
        <div className="font-medium">{type}</div>
        <div className="text-[10px] opacity-90">
          Rest: {Math.round(interval.restKm).toLocaleString()} km
        </div>
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-64">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <div className="text-xs text-white space-y-1">
            <div className="font-bold text-blue-400 mb-2">{type} Wartungsintervall</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-400">Seit letzter:</span>
                <div className="text-white">{interval.kmSinceLast.toLocaleString()} km</div>
                <div className="text-white">{interval.daysSinceLast} Tage</div>
              </div>
              <div>
                <span className="text-gray-400">Restlauf:</span>
                <div className="text-white">{interval.restKm.toLocaleString()} km</div>
                <div className="text-white">{interval.restDays} Tage</div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-[10px] text-gray-400">
                Intervall: {interval.intervalKm.toLocaleString()} km / {interval.intervalDays} Tage
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrainsClientExtended({ initialTrains }: TrainsClientProps) {
  const [trains] = useState<Train[]>(initialTrains);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMaintenanceColumns, setShowMaintenanceColumns] = useState(true);
  const [maintenanceFilter, setMaintenanceFilter] = useState<string>('');
  const [restKmFilter, setRestKmFilter] = useState<number | null>(null);
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState({
    region: '',
    line: '',
    status: '',
    search: ''
  });
  
  const itemsPerPage = 20;

  // Sortierung
  const sortedTrains = [...trains].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    
    // Spezialbehandlung für Wartungsintervalle
    if (sortField.includes('restKm')) {
      const type = sortField.split('_')[0]; // IS1, IS2, etc.
      aVal = a.maintenanceInfo?.[type as keyof MaintenanceInfo]?.restKm ?? Infinity;
      bVal = b.maintenanceInfo?.[type as keyof MaintenanceInfo]?.restKm ?? Infinity;
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter anwenden
  const filteredTrains = sortedTrains.filter(train => {
    if (filters.region && train.region !== filters.region) return false;
    if (filters.line && train.lineId !== filters.line) return false;
    if (filters.status && train.status !== filters.status) return false;
    if (filters.search && !train.id.toLowerCase().includes(filters.search.toLowerCase())) return false;
    
    // Wartungsfilter
    if (maintenanceFilter) {
      const [type, statusFilter] = maintenanceFilter.split('_');
      const interval = train.maintenanceInfo?.[type as keyof MaintenanceInfo];
      if (!interval) return false;
      if (statusFilter === 'red' && interval.status !== 'red') return false;
      if (statusFilter === 'yellow' && interval.status !== 'yellow') return false;
    }
    
    // Rest-km Filter
    if (restKmFilter) {
      const hasLowRestKm = ['IS1', 'IS2', 'IS3', 'IS4', 'Lathe'].some(type => {
        const interval = train.maintenanceInfo?.[type as keyof MaintenanceInfo];
        return interval && interval.restKm < restKmFilter;
      });
      if (!hasLowRestKm) return false;
    }
    
    return true;
  });

  // Paginierung
  const totalPages = Math.ceil(filteredTrains.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTrains = filteredTrains.slice(startIndex, endIndex);

  // CSV-Export
  const handleExport = () => {
    const csvData = [
      [
        'Zug-ID', 'Linie', 'Region', 'Status', 'Depot', 'Serie', 
        'Verspätung (min)', 'Geschwindigkeit (km/h)', 'Health Score', 
        'IS1 Rest-km', 'IS1 Rest-Tage', 'IS1 Status',
        'IS2 Rest-km', 'IS2 Rest-Tage', 'IS2 Status',
        'IS3 Rest-km', 'IS3 Rest-Tage', 'IS3 Status',
        'IS4 Rest-km', 'IS4 Rest-Tage', 'IS4 Status',
        'Lathe Rest-km', 'Lathe Rest-Tage', 'Lathe Status'
      ],
      ...filteredTrains.map(train => [
        train.id,
        train.lineId,
        train.region,
        train.status,
        train.depot,
        train.series || '',
        train.delayMin?.toString() || '0',
        train.speedKmh?.toString() || '0',
        train.healthScore?.toString() || '',
        train.maintenanceInfo?.IS1?.restKm?.toString() || '',
        train.maintenanceInfo?.IS1?.restDays?.toString() || '',
        train.maintenanceInfo?.IS1?.status || '',
        train.maintenanceInfo?.IS2?.restKm?.toString() || '',
        train.maintenanceInfo?.IS2?.restDays?.toString() || '',
        train.maintenanceInfo?.IS2?.status || '',
        train.maintenanceInfo?.IS3?.restKm?.toString() || '',
        train.maintenanceInfo?.IS3?.restDays?.toString() || '',
        train.maintenanceInfo?.IS3?.status || '',
        train.maintenanceInfo?.IS4?.restKm?.toString() || '',
        train.maintenanceInfo?.IS4?.restDays?.toString() || '',
        train.maintenanceInfo?.IS4?.status || '',
        train.maintenanceInfo?.Lathe?.restKm?.toString() || '',
        train.maintenanceInfo?.Lathe?.restDays?.toString() || '',
        train.maintenanceInfo?.Lathe?.status || ''
      ])
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zuege-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Spalten-Toggle für Wartung
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-gray-800 p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Fahrzeugübersicht</h1>
            <p className="text-gray-300">
              <span className="font-semibold text-white">{trains.length} Fahrzeuge</span> • 
              Wartungsintervalle & Restlaufzeiten
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowMaintenanceColumns(!showMaintenanceColumns)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                showMaintenanceColumns 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Wartungsdaten {showMaintenanceColumns ? 'ein' : 'aus'}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV-Export ({filteredTrains.length} Zeilen)
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Filter */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Suche</label>
              <input
                type="text"
                placeholder="Zug-ID..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Region</label>
              <select
                value={filters.region}
                onChange={(e) => {
                  setFilters({ ...filters, region: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Alle</option>
                <option value="BW">Baden-Württemberg</option>
                <option value="BY">Bayern</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Alle</option>
                <option value="active">Aktiv</option>
                <option value="maintenance">Wartung</option>
                <option value="inspection">Inspektion</option>
                <option value="standby">Bereitschaft</option>
                <option value="reserve">Reserve</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Wartungsampel</label>
              <select
                value={maintenanceFilter}
                onChange={(e) => {
                  setMaintenanceFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Alle</option>
                <option value="IS1_red">IS1 Rot</option>
                <option value="IS2_red">IS2 Rot</option>
                <option value="IS3_red">IS3 Rot</option>
                <option value="IS4_red">IS4 Rot</option>
                <option value="Lathe_red">Lathe Rot</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Rest-km unter</label>
              <select
                value={restKmFilter || ''}
                onChange={(e) => {
                  setRestKmFilter(e.target.value ? parseInt(e.target.value) : null);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Alle</option>
                <option value="1000">1.000 km</option>
                <option value="5000">5.000 km</option>
                <option value="10000">10.000 km</option>
                <option value="20000">20.000 km</option>
              </select>
            </div>
          </div>
          
          {(filters.region || filters.line || filters.status || filters.search || maintenanceFilter || restKmFilter) && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {filteredTrains.length} von {trains.length} Zügen gefiltert
              </span>
              <button
                onClick={() => {
                  setFilters({ region: '', line: '', status: '', search: '' });
                  setMaintenanceFilter('');
                  setRestKmFilter(null);
                  setCurrentPage(1);
                }}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Filter zurücksetzen
              </button>
            </div>
          )}
        </div>

        {/* Tabelle */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50 border-b border-gray-600">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                    onClick={() => handleSort('id')}
                  >
                    Zug-ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Linie</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Health</th>
                  
                  {showMaintenanceColumns && (
                    <>
                      <th 
                        className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => handleSort('IS1_restKm')}
                      >
                        IS1 {sortField === 'IS1_restKm' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => handleSort('IS2_restKm')}
                      >
                        IS2 {sortField === 'IS2_restKm' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => handleSort('IS3_restKm')}
                      >
                        IS3 {sortField === 'IS3_restKm' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => handleSort('IS4_restKm')}
                      >
                        IS4 {sortField === 'IS4_restKm' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => handleSort('Lathe_restKm')}
                      >
                        Lathe {sortField === 'Lathe_restKm' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {currentTrains.map((train) => (
                  <tr key={train.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/trains/${encodeURIComponent(train.id)}`} className="font-medium text-blue-400 hover:text-blue-300">
                        {train.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{train.lineId}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        train.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        train.status === 'maintenance' ? 'bg-yellow-500/20 text-yellow-400' :
                        train.status === 'inspection' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {train.status === 'active' ? 'Aktiv' :
                         train.status === 'maintenance' ? 'Wartung' :
                         train.status === 'inspection' ? 'Inspektion' :
                         train.status === 'standby' ? 'Bereitschaft' : train.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {train.healthScore && (
                        <div className="flex items-center justify-center gap-1">
                          <div className="w-12 bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                train.healthScore >= 90 ? 'bg-green-500' :
                                train.healthScore >= 75 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${train.healthScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{train.healthScore}%</span>
                        </div>
                      )}
                    </td>
                    
                    {showMaintenanceColumns && (
                      <>
                        <td className="px-4 py-3 text-center">
                          <MaintenanceBadge type="IS1" interval={train.maintenanceInfo?.IS1} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <MaintenanceBadge type="IS2" interval={train.maintenanceInfo?.IS2} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <MaintenanceBadge type="IS3" interval={train.maintenanceInfo?.IS3} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <MaintenanceBadge type="IS4" interval={train.maintenanceInfo?.IS4} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <MaintenanceBadge type="Lathe" interval={train.maintenanceInfo?.Lathe} />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Zeige {startIndex + 1}-{Math.min(endIndex, filteredTrains.length)} von {filteredTrains.length} Einträgen
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zurück
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm rounded ${
                        pageNum === currentPage 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
