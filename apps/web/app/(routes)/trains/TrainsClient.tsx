'use client';

import { useState } from 'react';

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
}

interface TrainsClientProps {
  initialTrains: Train[];
}

export default function TrainsClient({ initialTrains }: TrainsClientProps) {
  const [trains] = useState<Train[]>(initialTrains);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    region: '',
    line: '',
    status: '',
    search: ''
  });
  
  const itemsPerPage = 20;

  // Filter anwenden
  const filteredTrains = trains.filter(train => {
    if (filters.region && train.region !== filters.region) return false;
    if (filters.line && train.lineId !== filters.line) return false;
    if (filters.status && train.status !== filters.status) return false;
    if (filters.search && !train.id.toLowerCase().includes(filters.search.toLowerCase())) return false;
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
      ['Zug-ID', 'Linie', 'Region', 'Status', 'Depot', 'Serie', 'Verspätung (min)', 'Geschwindigkeit (km/h)', 'Health Score', 'Nächste Wartung'],
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
        train.nextMaintenanceDate || ''
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

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-gray-800 p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Fahrzeugübersicht</h1>
            <p className="text-gray-300">
              <span className="font-semibold text-white">{trains.length} Einträge</span> • 
              Echtzeit-Fahrzeugdaten
            </p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV-Export ({filteredTrains.length} Zeilen)
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Filter */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <label className="block text-sm text-gray-400 mb-1">Linie</label>
              <select
                value={filters.line}
                onChange={(e) => {
                  setFilters({ ...filters, line: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Alle</option>
                <option value="RE9">RE9</option>
                <option value="MEX16">MEX16</option>
                <option value="RE8">RE8</option>
                <option value="RE1">RE1</option>
                <option value="RE89">RE89</option>
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
                <option value="maintenance">In Wartung</option>
                <option value="standby">Bereitschaft</option>
                <option value="inspection">Inspektion</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Verspätung</label>
              <select
                disabled
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-500"
              >
                <option>Alle</option>
              </select>
            </div>
          </div>
          
          {(filters.region || filters.line || filters.status || filters.search) && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {filteredTrains.length} von {trains.length} Zügen gefiltert
              </span>
              <button
                onClick={() => {
                  setFilters({ region: '', line: '', status: '', search: '' });
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Zug-ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Linie</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Region</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Depot</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Verspätung</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Geschw.</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Health</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Nächste Wartung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {currentTrains.map((train) => (
                  <tr key={train.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <a href={`/trains/${train.id}`} className="font-medium text-blue-400 hover:text-blue-300">
                        {train.id}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{train.lineId}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        train.region === 'BW' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {train.region}
                      </span>
                    </td>
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
                    <td className="px-4 py-3 text-gray-300">{train.depot}</td>
                    <td className="px-4 py-3 text-center">
                      {train.delayMin !== undefined && (
                        <span className={
                          train.delayMin > 5 ? 'text-red-400' :
                          train.delayMin > 0 ? 'text-yellow-400' :
                          train.delayMin < 0 ? 'text-green-400' :
                          'text-gray-300'
                        }>
                          {train.delayMin > 0 ? '+' : ''}{train.delayMin} min
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">
                      {train.speedKmh ? `${train.speedKmh} km/h` : '-'}
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
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {train.nextMaintenanceDate ? 
                        new Date(train.nextMaintenanceDate).toLocaleDateString('de-DE') : 
                        '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginierung */}
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Zeige {startIndex + 1}-{Math.min(endIndex, filteredTrains.length)} von{' '}
            <span className="font-semibold text-white">{filteredTrains.length}</span> Einträgen
            {filters.search || filters.region || filters.line || filters.status ? 
              <span className="ml-2">(gefiltert von {trains.length})</span> : 
              ''
            }
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              Zurück
            </button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ${
                currentPage === totalPages 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              Weiter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
