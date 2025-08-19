'use client';

import { useState } from 'react';
import { LoadingSpinner, EmptyState } from '@eucorail/ui';
import { TrainSearch } from '@/features/search/TrainSearch';
import { MapFilters } from '@/features/filters/MapFilters';

export default function TestUIPage() {
  const [showComponents, setShowComponents] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-blue-600">Eucorail FleetOps - Feature Test</h1>
          <p className="text-gray-600 mt-2">Suche und Filter Features</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Zugsuche</h2>
          <TrainSearch />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <MapFilters />
          </div>
          <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Gefilterte Ergebnisse</h2>
            <EmptyState title="Wähle Filter aus" description="Die gefilterten Züge werden hier angezeigt" />
          </div>
        </div>

        {showComponents && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">UI Komponenten</h2>
            <div className="flex gap-4">
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSpinner size="lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


