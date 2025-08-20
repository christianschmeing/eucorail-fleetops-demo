'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import { ComplianceTracker } from '@/components/compliance/ComplianceTracker';
import { SLADashboard } from '@/components/sla/SLADashboard';
import { useFleetStore } from '@/lib/state/fleet-store';
import { ECM_PROFILES, INTERVENTION_MAPPING } from '@/lib/maintenance/ecm-profiles';

export function MaintenanceDashboard() {
  const { vehicles, calculateKPIs } = useFleetStore();
  const [data, setData] = useState<any>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/data/maintenance-data.json', { cache: 'no-store' });
        if (r.ok) setData(await r.json());
      } catch {}
    })();
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles.find((v: any) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logos/eucorail.svg" className="h-8" alt="Eucorail" />
            <div>
              <h1 className="text-2xl font-bold">Maintenance Control Center</h1>
              <p className="text-sm text-gray-600">Fleet Technical Management System</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <aside className="w-80 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b space-y-2">
            <input
              type="search"
              placeholder="Search vehicle ID or type..."
              className="w-full px-3 py-2 border rounded-lg"
            />
            <details>
              <summary className="text-sm cursor-pointer select-none">
                Filter: Fällige IS2/IS3
              </summary>
              <div className="mt-2 space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked />
                  IS2 in ≤ 25% Rest (km)
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked />
                  IS3 in ≤ 25% Rest (km)
                </label>
              </div>
            </details>
          </div>
          <div className="p-2 space-y-1">
            {vehicles.map((v: any) => (
              <button
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-lg',
                  selectedVehicleId === v.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{v.id}</div>
                  <Badge>{v.type}</Badge>
                </div>
                <div className="text-xs text-gray-600">Health 100%</div>
              </button>
            ))}
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <Card>
              <CardBody>
                <CardTitle>Depot Operations Overview</CardTitle>
                <div className="h-48 rounded-lg bg-gray-100 border flex items-center justify-center text-gray-500">
                  Workshop visualization placeholder
                </div>
              </CardBody>
            </Card>

            {selectedVehicle && (
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <span className="text-2xl font-bold">{selectedVehicle.id}</span>
                      <Badge>{selectedVehicle.type}</Badge>
                    </CardTitle>
                    <div className="text-sm text-gray-600">Health 100%</div>
                  </div>
                  <div className="mt-4 space-y-6">
                    <Tabs
                      tabs={[
                        { key: 'overview', label: 'Overview' },
                        { key: 'technical', label: 'Technical' },
                        { key: 'workshop', label: 'Workshop' },
                        { key: 'predictive', label: 'AI Insights' },
                        { key: 'compliance', label: 'Compliance' },
                        { key: 'sla', label: 'SLA Monitor' },
                      ]}
                      active={'overview'}
                      onChange={() => {}}
                    />
                    <div className="space-y-6">
                      <ComplianceTracker />
                      <SLADashboard />
                      {/* IS1..IS6 mapping summary */}
                      <div className="p-4 border rounded-lg">
                        <div className="font-semibold mb-2">
                          Interventions (IS1–IS6 ↔ DB F1–F6)
                        </div>
                        <div className="text-xs text-gray-600">
                          {INTERVENTION_MAPPING.description}
                        </div>
                        <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(INTERVENTION_MAPPING.mapping).map(([k, v]: any) => (
                            <li
                              key={k}
                              className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded"
                            >
                              <span className="font-mono">{k}</span>
                              <span>→ {v.maps_to}</span>
                              <span className="text-gray-500">
                                Codes: {(v.db_is_codes || []).join(', ')}
                              </span>
                              <span className="text-gray-500">
                                Interval: {(v.typical_interval.km || []).join('–')} km
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
