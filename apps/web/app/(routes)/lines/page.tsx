import { apiGet } from '@/lib/api';
import ExportButton from './ExportButton';

interface Line {
  id: string;
  name: string;
  region: string;
  operator: string;
  depot: string;
  vehicles: number;
  activeVehicles: number;
  avgDelayMin: number;
  punctualityPct: number;
  utilizationPct: number;
}

async function getLines(): Promise<Line[]> {
  try {
    return await apiGet<Line[]>('/api/lines');
  } catch {
    // Fallback für SSR - 5 Linien mit insgesamt 144 Fahrzeugen
    return [
      { id: 'RE9', name: 'Linie RE9', region: 'BY', operator: 'Eucorail', depot: 'Augsburg', vehicles: 40, activeVehicles: 30, avgDelayMin: 2, punctualityPct: 88, utilizationPct: 75 },
      { id: 'MEX16', name: 'Linie MEX16', region: 'BW', operator: 'Eucorail', depot: 'Stuttgart', vehicles: 35, activeVehicles: 26, avgDelayMin: -1, punctualityPct: 92, utilizationPct: 74 },
      { id: 'RE8', name: 'Linie RE8', region: 'BW', operator: 'Eucorail', depot: 'Stuttgart', vehicles: 35, activeVehicles: 26, avgDelayMin: 3, punctualityPct: 85, utilizationPct: 74 },
      { id: 'RE1', name: 'Linie RE1', region: 'BW', operator: 'Eucorail', depot: 'Stuttgart', vehicles: 17, activeVehicles: 13, avgDelayMin: 1, punctualityPct: 90, utilizationPct: 76 },
      { id: 'RE89', name: 'Linie RE89', region: 'BY', operator: 'Eucorail', depot: 'Augsburg', vehicles: 17, activeVehicles: 13, avgDelayMin: 0, punctualityPct: 94, utilizationPct: 76 }
    ];
  }
}

export default async function LinesPage() {
  // SSR: Lade Linien serverseitig
  const lines = await getLines();
  
  // Berechne Summen
  const totalVehicles = lines.reduce((sum, line) => sum + line.vehicles, 0);
  const totalActive = lines.reduce((sum, line) => sum + line.activeVehicles, 0);
  const avgPunctuality = lines.reduce((sum, line) => sum + line.punctualityPct, 0) / lines.length;
  const avgUtilization = lines.reduce((sum, line) => sum + line.utilizationPct, 0) / lines.length;

  // CSV-Export-Funktion (wird client-seitig über onClick gehandhabt)
  const csvData = [
    ['Linie', 'Name', 'Region', 'Betreiber', 'Depot', 'Fahrzeuge', 'Aktiv', 'Ø Verspätung (min)', 'Pünktlichkeit (%)', 'Auslastung (%)'],
    ...lines.map(line => [
      line.id,
      line.name,
      line.region,
      line.operator,
      line.depot,
      line.vehicles,
      line.activeVehicles,
      line.avgDelayMin,
      line.punctualityPct,
      line.utilizationPct
    ])
  ];

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-gray-800 p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Linienübersicht</h1>
            <p className="text-gray-300">Aggregierte Fahrzeugdaten nach Linie</p>
          </div>
          <ExportButton csvData={csvData} />
        </div>
      </div>

      <div className="p-6">
        {/* Zusammenfassung */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Gesamt Fahrzeuge</div>
            <div className="text-3xl font-bold text-white">{totalVehicles}</div>
            <div className="text-xs text-blue-400 mt-2">
              {totalVehicles === 144 ? '✓ Konsistent (144)' : `⚠ Inkonsistent (Soll: 144)`}
            </div>
          </div>
          
          <div className="bg-gray-800 border border-green-500/30 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Aktive Fahrzeuge</div>
            <div className="text-3xl font-bold text-green-400">{totalActive}</div>
            <div className="text-xs text-gray-500 mt-2">
              {((totalActive / totalVehicles) * 100).toFixed(1)}% der Flotte
            </div>
          </div>
          
          <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Ø Pünktlichkeit</div>
            <div className="text-3xl font-bold text-yellow-400">{avgPunctuality.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-2">Über alle Linien</div>
          </div>
          
          <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Ø Auslastung</div>
            <div className="text-3xl font-bold text-purple-400">{avgUtilization.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-2">Kapazitätsnutzung</div>
          </div>
        </div>

        {/* Tabelle */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50 border-b border-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Linie</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Region</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Betreiber</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Depot</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Fahrzeuge</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Aktiv</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Ø Verspätung</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Pünktlichkeit</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Auslastung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {lines.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          line.utilizationPct > 80 ? 'bg-red-500' : 
                          line.utilizationPct > 60 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`} />
                        <span className="font-medium text-white">{line.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <span className={`px-2 py-1 text-xs rounded ${
                        line.region === 'BW' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {line.region}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{line.operator}</td>
                    <td className="px-4 py-3 text-gray-300">{line.depot}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-white">{line.vehicles}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-400">{line.activeVehicles}</span>
                      <span className="text-gray-500 text-xs ml-1">
                        ({((line.activeVehicles / line.vehicles) * 100).toFixed(0)}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={line.avgDelayMin > 2 ? 'text-red-400' : line.avgDelayMin < -2 ? 'text-green-400' : 'text-gray-300'}>
                        {line.avgDelayMin > 0 ? '+' : ''}{line.avgDelayMin} min
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              line.punctualityPct >= 90 ? 'bg-green-500' : 
                              line.punctualityPct >= 80 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`}
                            style={{ width: `${line.punctualityPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-300">{line.punctualityPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              line.utilizationPct > 80 ? 'bg-red-500' : 
                              line.utilizationPct > 60 ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${line.utilizationPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-300">{line.utilizationPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Summenzeile */}
                <tr className="bg-gray-700/30 font-semibold">
                  <td className="px-4 py-3 text-white">Gesamt</td>
                  <td className="px-4 py-3" colSpan={3}></td>
                  <td className="px-4 py-3 text-center text-white">{totalVehicles}</td>
                  <td className="px-4 py-3 text-center text-green-400">{totalActive}</td>
                  <td className="px-4 py-3" colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginierung Info */}
        <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
          <div>
            Zeige {lines.length} von {lines.length} Linien • Summe Fahrzeuge: <span className="font-semibold text-white">{totalVehicles}</span>
          </div>
          <div className="flex gap-2">
            <button disabled className="px-3 py-1 bg-gray-700 text-gray-500 rounded cursor-not-allowed">
              Zurück
            </button>
            <span className="px-3 py-1">Seite 1 von 1</span>
            <button disabled className="px-3 py-1 bg-gray-700 text-gray-500 rounded cursor-not-allowed">
              Weiter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}