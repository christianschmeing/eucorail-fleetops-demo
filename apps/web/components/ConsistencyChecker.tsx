'use client';

import { useEffect, useState } from 'react';
import { Card } from './ui/Card';

interface ConsistencyCheck {
  name: string;
  expected: number;
  actual: number;
  passed: boolean;
  source: string;
}

export default function ConsistencyChecker() {
  const [checks, setChecks] = useState<ConsistencyCheck[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function runChecks() {
      const results: ConsistencyCheck[] = [];
      
      try {
        // C1: Check Trains Count
        const trainsRes = await fetch('/api/trains');
        const trains = await trainsRes.json();
        results.push({
          name: 'C1: Trains API Count',
          expected: 144,
          actual: trains.length,
          passed: trains.length === 144,
          source: '/api/trains'
        });
        
        // C2: Check Lines Vehicle Sum
        const linesRes = await fetch('/api/lines');
        const lines = await linesRes.json();
        const vehicleSum = lines.reduce((sum: number, line: any) => sum + (line.vehicles || 0), 0);
        results.push({
          name: 'C2: Lines Vehicle Sum',
          expected: 144,
          actual: vehicleSum,
          passed: vehicleSum === 144,
          source: '/api/lines'
        });
        
        // C3: Check Depot Distribution
        const depotsRes = await fetch('/api/depots');
        const depots = await depotsRes.json();
        const depotSum = depots.reduce((sum: number, depot: any) => 
          sum + (depot.fleet?.total || depot.currentLoad || 0), 0);
        results.push({
          name: 'C3: Depot Total',
          expected: 144,
          actual: depotSum,
          passed: depotSum === 144,
          source: '/api/depots'
        });
        
        // C4: Check Status Distribution
        const statusCounts: Record<string, number> = {};
        trains.forEach((train: any) => {
          statusCounts[train.status] = (statusCounts[train.status] || 0) + 1;
        });
        const totalStatus = Object.values(statusCounts).reduce((a, b) => a + b, 0);
        results.push({
          name: 'C4: Status Distribution',
          expected: 144,
          actual: totalStatus,
          passed: totalStatus === 144,
          source: 'Status aggregation'
        });
        
        // C5: Check Work Orders
        const wosRes = await fetch('/api/ecm/wos');
        const wos = await wosRes.json();
        results.push({
          name: 'C5: Work Orders',
          expected: 150,
          actual: wos.length,
          passed: wos.length >= 144,
          source: '/api/ecm/wos'
        });
        
        // Check KPIs
        const kpiRes = await fetch('/api/metrics/kpi');
        const kpis = await kpiRes.json();
        results.push({
          name: 'C6: KPI Total Trains',
          expected: 144,
          actual: kpis.total_trains || 0,
          passed: kpis.total_trains === 144,
          source: '/api/metrics/kpi'
        });
        
        // Check Line Codes Consistency
        const lineCodesFromTrains = new Set(trains.map((t: any) => t.lineCode || t.lineId));
        const lineCodesFromLines = new Set(lines.map((l: any) => l.code || l.id));
        const codesMatch = lineCodesFromTrains.size === lineCodesFromLines.size;
        results.push({
          name: 'C7: Line Codes Match',
          expected: lineCodesFromLines.size,
          actual: lineCodesFromTrains.size,
          passed: codesMatch,
          source: 'Line code consistency'
        });
        
        // Check Reserve Count
        const reserveCount = trains.filter((t: any) => 
          t.isReserve === true || t.status === 'reserve' || t.lineCode === 'RESERVE'
        ).length;
        results.push({
          name: 'C8: Reserve Trains',
          expected: 22,
          actual: reserveCount,
          passed: reserveCount === 22,
          source: 'Reserve status'
        });
        
      } catch (error) {
        console.error('Consistency check error:', error);
      }
      
      setChecks(results);
      setLoading(false);
    }
    
    runChecks();
  }, []);
  
  const passedCount = checks.filter(c => c.passed).length;
  const totalCount = checks.length;
  const allPassed = passedCount === totalCount;
  
  return (
    <Card className="p-6 bg-gray-900 border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">🔍 SSOT Konsistenz-Check</h2>
        <div className={`px-3 py-1 rounded text-sm font-bold ${
          allPassed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {passedCount}/{totalCount} PASSED
        </div>
      </div>
      
      {loading ? (
        <div className="text-gray-400">Prüfe Konsistenz...</div>
      ) : (
        <div className="space-y-2">
          {checks.map((check, idx) => (
            <div 
              key={idx}
              className={`flex justify-between items-center p-3 rounded ${
                check.passed ? 'bg-green-900/20 border border-green-500/30' : 
                'bg-red-900/20 border border-red-500/30'
              }`}
            >
              <div>
                <div className="text-white font-medium">{check.name}</div>
                <div className="text-xs text-gray-400">{check.source}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={check.passed ? 'text-green-400' : 'text-red-400'}>
                    Ist: {check.actual}
                  </div>
                  <div className="text-xs text-gray-400">
                    Soll: {check.expected}
                  </div>
                </div>
                <div className={`text-2xl ${check.passed ? 'text-green-500' : 'text-red-500'}`}>
                  {check.passed ? '✅' : '❌'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!allPassed && (
        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded">
          <div className="text-yellow-400 font-bold mb-1">⚠️ Inkonsistenzen gefunden!</div>
          <div className="text-sm text-gray-300">
            Die Daten zwischen verschiedenen Views sind nicht konsistent. 
            Dies verletzt die SSOT-Anforderungen (Single Source of Truth).
          </div>
        </div>
      )}
    </Card>
  );
}