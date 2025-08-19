'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export interface ConsistencyCheck {
  id: string;
  label: string;
  passed: boolean;
  expected: number | string;
  actual: number | string;
  message?: string;
}

interface ConsistencyCheckerProps {
  checks: ConsistencyCheck[];
  onRefresh?: () => void;
}

export function ConsistencyChecker({ checks, onRefresh }: ConsistencyCheckerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const allPassed = checks.every(c => c.passed);
  
  // Auto-expand wenn Fehler vorhanden
  useEffect(() => {
    if (!allPassed) {
      setIsExpanded(true);
    }
  }, [allPassed]);

  if (checks.length === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-md ${isExpanded ? 'w-96' : 'w-auto'}`}>
      {/* Kompakte Ansicht / Header */}
      <div 
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg cursor-pointer transition-colors ${
          allPassed 
            ? 'bg-green-900/90 hover:bg-green-900 border border-green-500/50' 
            : 'bg-red-900/90 hover:bg-red-900 border border-red-500/50'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {allPassed ? (
          <CheckCircle className="h-5 w-5 text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 text-red-400" />
        )}
        <span className={`font-medium ${allPassed ? 'text-green-100' : 'text-red-100'}`}>
          Konsistenz: {checks.filter(c => c.passed).length}/{checks.length} Checks
        </span>
        <span className="text-gray-400 text-sm ml-auto">
          {isExpanded ? '▼' : '▲'}
        </span>
      </div>

      {/* Erweiterte Ansicht */}
      {isExpanded && (
        <div className="mt-2 bg-gray-900/95 rounded-lg shadow-xl border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-200">Konsistenz-Prüfungen</h3>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
              >
                Aktualisieren
              </button>
            )}
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {checks.map(check => (
              <div 
                key={check.id}
                className={`p-2 rounded border ${
                  check.passed 
                    ? 'bg-green-950/50 border-green-800/50' 
                    : 'bg-red-950/50 border-red-800/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  {check.passed ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-200">
                      {check.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Erwartet: <span className="font-mono text-gray-300">{check.expected}</span>
                      {' | '}
                      Aktuell: <span className={`font-mono ${check.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {check.actual}
                      </span>
                    </div>
                    {check.message && (
                      <div className="text-xs text-gray-500 mt-1">{check.message}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!allPassed && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-red-400">
                ⚠️ Datenkonsistenz-Fehler erkannt. Bitte Backend-Konfiguration prüfen.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
