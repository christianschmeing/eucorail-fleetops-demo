'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@eucorail/ui';
import { trackGeometries } from '@/app/(routes)/depot/track-geometries';
import { clsx } from 'clsx';
import { ComplianceTracker } from '@/components/compliance/ComplianceTracker';
import { SLADashboard } from '@/components/sla/SLADashboard';
import { useFleetStore } from '@/lib/state/fleet-store';
import {
  ECM_PROFILES,
  INTERVENTION_MAPPING,
  FAILURE_RATES_PER_10K_KM,
} from '@/lib/maintenance/ecm-profiles';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MaintenanceDashboard() {
  const router = useRouter();
  const search = useSearchParams();
  const { vehicles, calculateKPIs, expectedFailuresPerMonth, expectedFailuresPerYear } =
    useFleetStore();
  const [data, setData] = useState<any>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [filterDueIS1, setFilterDueIS1] = useState(false);
  const [filterDueIS2, setFilterDueIS2] = useState(true);
  const [filterDueIS3, setFilterDueIS3] = useState(true);
  const [filterDueIS456, setFilterDueIS456] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [planDepot, setPlanDepot] = useState<'Essingen' | 'Langweid'>('Essingen');
  const [planTrack, setPlanTrack] = useState<string>('');
  const [planStart, setPlanStart] = useState<string>('');
  const [planDurationH, setPlanDurationH] = useState<number>(1);
  const [planPurpose, setPlanPurpose] = useState<
    'IS1' | 'IS2' | 'IS3' | 'IS4' | 'IS5' | 'IS6' | 'Corrective'
  >('IS2');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/data/maintenance-data.json', { cache: 'no-store' });
        if (r.ok) setData(await r.json());
      } catch {}
    })();
  }, []);

  // Honor deep-link query params: stage=ISx, focus={trainId}
  useEffect(() => {
    try {
      const stage = ((search && search.get('stage')) || '').toUpperCase();
      const focus = (search && search.get('focus')) || '';
      if (focus) setSelectedVehicleId(focus);
      if (stage) {
        setFilterDueIS1(false);
        setFilterDueIS2(false);
        setFilterDueIS3(false);
        setFilterDueIS456(false);
        if (stage === 'IS1') setFilterDueIS1(true);
        else if (stage === 'IS2') setFilterDueIS2(true);
        else if (stage === 'IS3') setFilterDueIS3(true);
        else if (stage === 'IS4' || stage === 'IS5' || stage === 'IS6') setFilterDueIS456(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles.find((v: any) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  // helper to determine nearing flags
  function nearing(v: any): {
    is1: boolean;
    is2: boolean;
    is3: boolean;
    is4: boolean;
    is5: boolean;
    is6: boolean;
  } {
    const key = String(v.type || '').toUpperCase();
    const p: any = (ECM_PROFILES as any)[key];
    if (!p) return { is1: false, is2: false, is3: false, is4: false, is5: false, is6: false };
    const mileage = v.mileageKm ?? 0;
    const calc = (stage: 'IS1' | 'IS2' | 'IS3' | 'IS4' | 'IS5' | 'IS6') => {
      const cfg = p[stage];
      if (!cfg) return false;
      const usage = ((mileage % cfg.periodKm) / cfg.periodKm) * 100;
      return usage >= 75;
    };
    return {
      is1: calc('IS1'),
      is2: calc('IS2'),
      is3: calc('IS3'),
      is4: calc('IS4'),
      is5: calc('IS5'),
      is6: calc('IS6'),
    };
  }

  // filter vehicles based on toggles
  const filteredVehicles = vehicles.filter((v: any) => {
    const flags = nearing(v);
    const wantsIS1 = filterDueIS1 ? flags.is1 : true;
    const wantsIS2 = filterDueIS2 ? flags.is2 : true;
    const wantsIS3 = filterDueIS3 ? flags.is3 : true;
    const wantsIS456 = filterDueIS456 ? flags.is4 || flags.is5 || flags.is6 : true;
    const anyFilter = filterDueIS1 || filterDueIS2 || filterDueIS3 || filterDueIS456;
    return anyFilter ? wantsIS1 || wantsIS2 || wantsIS3 || wantsIS456 : true;
  });

  function openPlanDialog(
    v: any,
    stage: 'IS1' | 'IS2' | 'IS3' | 'IS4' | 'IS5' | 'IS6' | 'Corrective' = 'IS2'
  ) {
    const depot = v.depot === 'ESS' ? 'Essingen' : 'Langweid';
    setPlanDepot(depot);
    const tracks = trackGeometries.filter((t) => t.depot === depot && t.state !== 'gesperrt');
    setPlanTrack(tracks[0]?.id || (depot === 'Essingen' ? 'E-H1' : 'L-H1'));
    const start = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16);
    setPlanStart(start);
    setPlanDurationH(1);
    setPlanPurpose(stage);
    setSelectedVehicleId(v.id);
    setPlanOpen(true);
  }

  function mostUrgentDueStage(
    v: any
  ): 'IS1' | 'IS2' | 'IS3' | 'IS4' | 'IS5' | 'IS6' | 'Corrective' {
    const fam = String(v.type || '').toUpperCase();
    const prof: any = (ECM_PROFILES as any)[fam] || {};
    const kmToNext = v.kmToNext || {};
    const stages: Array<'IS1' | 'IS2' | 'IS3' | 'IS4' | 'IS5' | 'IS6'> = [
      'IS1',
      'IS2',
      'IS3',
      'IS4',
      'IS5',
      'IS6',
    ];
    let best: any = null;
    for (const st of stages) {
      const cfg = prof[st];
      if (!cfg) continue;
      const rem = (kmToNext[st] ?? cfg.periodKm) as number;
      if (best == null || rem < best.rem) best = { st, rem };
    }
    return (best?.st as any) || 'IS2';
  }

  async function submitPlan() {
    const v = vehicles.find((x: any) => x.id === selectedVehicleId);
    if (!v) return;
    try {
      const depot = planDepot;
      const startISO = new Date(planStart).toISOString();
      const endISO = new Date(
        new Date(planStart).getTime() + planDurationH * 60 * 60 * 1000
      ).toISOString();
      const famKey = String(v.type || '').toUpperCase();
      const cfg: any = (ECM_PROFILES as any)[famKey]?.[planPurpose as any];
      const expectedDurationHours = (cfg?.durationHours as number) || planDurationH;
      const res = await fetch('/api/depot/allocations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          train_id: v.id,
          depot,
          trackId: planTrack,
          startPlanned: startISO,
          endPlanned: endISO,
          purpose: planPurpose,
          stage: (['IS1', 'IS2', 'IS3', 'IS4', 'IS5', 'IS6'] as const).includes(planPurpose as any)
            ? (planPurpose as any)
            : undefined,
          expectedDurationHours,
        }),
      });
      if (res.ok) {
        setPlanOpen(false);
        router.push(`/depot/map?depot=${depot}`);
      } else {
        console.error(await res.text());
        alert('Planung fehlgeschlagen');
      }
    } catch (e) {
      alert('Netzwerkfehler bei Planung');
    }
  }

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
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterDueIS1}
                  onChange={(e) => setFilterDueIS1(e.target.checked)}
                />
                IS1 fällig (≤ 25% Rest km)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterDueIS2}
                  onChange={(e) => setFilterDueIS2(e.target.checked)}
                />
                IS2 fällig (≤ 25% Rest km)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterDueIS3}
                  onChange={(e) => setFilterDueIS3(e.target.checked)}
                />
                IS3 fällig (≤ 25% Rest km)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterDueIS456}
                  onChange={(e) => setFilterDueIS456(e.target.checked)}
                />
                IS4–IS6 fällig (≤ 25% Rest km)
              </label>
            </div>
            <details>
              <summary className="text-sm cursor-pointer select-none">
                Erweiterte Filter: Fällige IS‑Stufen
              </summary>
              <div className="mt-2 space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterDueIS1}
                    onChange={(e) => setFilterDueIS1(e.target.checked)}
                  />
                  IS1 in ≤ 25% Rest (km)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterDueIS2}
                    onChange={(e) => setFilterDueIS2(e.target.checked)}
                  />
                  IS2 in ≤ 25% Rest (km)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterDueIS3}
                    onChange={(e) => setFilterDueIS3(e.target.checked)}
                  />
                  IS3 in ≤ 25% Rest (km)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterDueIS456}
                    onChange={(e) => setFilterDueIS456(e.target.checked)}
                  />
                  IS4–IS6 in ≤ 25% Rest (km)
                </label>
              </div>
            </details>
          </div>
          <div className="p-2 space-y-1">
            {filteredVehicles.map((v: any) => {
              const flags = nearing(v);
              const warn =
                flags.is1 || flags.is2 || flags.is3 || flags.is4 || flags.is5 || flags.is6;
              return (
                <div
                  key={v.id}
                  className={clsx('rounded-lg', warn ? 'ring-1 ring-yellow-400' : '')}
                >
                  <button
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={clsx(
                      'w-full text-left px-3 py-2 rounded-lg',
                      selectedVehicleId === v.id
                        ? 'bg-blue-50'
                        : warn
                          ? 'bg-yellow-50'
                          : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{v.id}</div>
                      <Badge>{v.type}</Badge>
                    </div>
                    <div className="text-xs text-gray-600">Health 100%</div>
                  </button>
                  <div className="px-3 pb-2">
                    <button
                      className="text-xs text-blue-600 hover:text-blue-700"
                      onClick={() => openPlanDialog(v, mostUrgentDueStage(v))}
                    >
                      → in Depot einplanen
                    </button>
                  </div>
                </div>
              );
            })}
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
                      {/* IHB Panel */}
                      <IHBPanel
                        vehicle={selectedVehicle}
                        onPlan={(stage) =>
                          openPlanDialog(
                            { id: selectedVehicle.id, depot: selectedVehicle.depot },
                            stage
                          )
                        }
                      />
                      {/* Predictive */}
                      <PredictivePanel vehicle={selectedVehicle} />
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
      <PlanDrawer
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        depot={planDepot}
        track={planTrack}
        onDepot={setPlanDepot}
        onTrack={setPlanTrack}
        start={planStart}
        onStart={setPlanStart}
        durationH={planDurationH}
        onDuration={setPlanDurationH}
        stage={planPurpose}
        onStage={setPlanPurpose}
        onSubmit={submitPlan}
      />
    </div>
  );
}

// Planungs-Drawer
function PlanDrawer({
  open,
  onClose,
  depot,
  track,
  onDepot,
  onTrack,
  start,
  onStart,
  durationH,
  onDuration,
  stage,
  onStage,
  onSubmit,
}: any) {
  const ess = trackGeometries.filter((t) => t.depot === 'Essingen' && t.state !== 'gesperrt');
  const lgw = trackGeometries.filter((t) => t.depot === 'Langweid' && t.state !== 'gesperrt');
  const tracks = depot === 'Essingen' ? ess : lgw;
  return (
    <Drawer open={open} onClose={onClose} side="right" title="In Depot einplanen">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Stufe</label>
          <select
            value={stage}
            onChange={(e) => onStage(e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            {['IS1', 'IS2', 'IS3', 'IS4', 'IS5', 'IS6', 'Corrective'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Depot</label>
          <select
            value={depot}
            onChange={(e) => onDepot(e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option>Essingen</option>
            <option>Langweid</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Gleis</label>
          <select
            value={track}
            onChange={(e) => onTrack(e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} – {t.name} ({t.type})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start</label>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => onStart(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Dauer</label>
          <select
            value={durationH}
            onChange={(e) => onDuration(Number(e.target.value))}
            className="w-full border rounded px-2 py-1"
          >
            {[1, 2, 3, 4, 6, 8].map((h) => (
              <option key={h} value={h}>
                {h} h
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Abbrechen
          </button>
          <button onClick={onSubmit} className="px-3 py-1 bg-blue-600 text-white rounded">
            Einplanen
          </button>
        </div>
      </div>
    </Drawer>
  );
}

function IHBPanel({
  vehicle,
  onPlan,
}: {
  vehicle: any;
  onPlan: (stage: 'IS1' | 'IS2' | 'IS3' | 'IS4' | 'IS5' | 'IS6') => void;
}) {
  const key = String(vehicle.type || '').toUpperCase();
  const prof: any = (ECM_PROFILES as any)[key];
  if (!prof) return null;
  const stages: Array<'IS1' | 'IS2' | 'IS3' | 'IS4' | 'IS5' | 'IS6'> = [
    'IS1',
    'IS2',
    'IS3',
    'IS4',
    'IS5',
    'IS6',
  ];
  const kmToNext = vehicle.kmToNext || {};
  const daysToNext = vehicle.daysToNext || {};
  const statusColor = (st: any) => {
    const cfg = prof[st];
    if (!cfg) return 'bg-gray-200';
    const rem = (kmToNext[st] ?? cfg.periodKm) / cfg.periodKm;
    if (rem > 0.5) return 'bg-green-100 text-green-700';
    if (rem > 0.25) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };
  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="font-semibold mb-2">IHB / ECM Übersicht</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {stages.map((st) => {
          const cfg = prof[st];
          if (!cfg) return null;
          return (
            <div key={st} className={`p-3 rounded border ${statusColor(st)}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-mono font-semibold">{st}</div>
                <div className="text-xs">{cfg.durationHours} h</div>
              </div>
              <div className="text-xs">
                Rest: {(kmToNext[st] ?? 0).toLocaleString()} km • {daysToNext[st] ?? 0} Tage
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                  onClick={() => onPlan(st)}
                >
                  Jetzt planen
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PredictivePanel({ vehicle }: { vehicle: any }) {
  const { expectedFailuresPerMonth, expectedFailuresPerYear } = useFleetStore();
  const mileage = vehicle.mileageKm || 0;
  const fam = String(vehicle.type || '').toUpperCase();
  const common = FAILURE_RATES_PER_10K_KM.common as any;
  const spec = (FAILURE_RATES_PER_10K_KM.specific as any)[fam] || {};
  const per10k = { ...common, ...spec } as Record<string, number>;
  const factor = mileage / 10000;
  const entries = Object.entries(per10k).map(([k, v]) => ({
    comp: k,
    expectedPerYear: v * factor,
    expectedPerMonth: (v * factor) / 12,
  }));
  const totalMonth = expectedFailuresPerMonth(vehicle.type, mileage);
  const totalYear = expectedFailuresPerYear(vehicle.type, mileage);
  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="font-semibold mb-2">Predictive Insights</div>
      <div className="text-sm mb-2">
        Erwartete Korrekturen: {totalMonth.toFixed(2)} / Monat · {totalYear.toFixed(1)} / Jahr
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {entries.map((e) => (
          <div key={e.comp} className="flex items-center justify-between border rounded px-2 py-1">
            <span>{e.comp}</span>
            <span>{e.expectedPerMonth.toFixed(2)}/Monat</span>
          </div>
        ))}
      </div>
    </div>
  );
}
