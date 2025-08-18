'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { exportToCsv } from '@/components/table/export';
import { TableView, type TableColumn } from '@/components/table/TableView';

type Policy = { id: string; title: string; intervalDays?: number; active: boolean };
type Measure = { id: string; title: string; component?: string };
type WO = {
  id: string;
  trainId: string;
  title: string;
  dueDate: string;
  priority: 'P0' | 'P1' | 'P2';
  depotId: string;
  status: 'NEW' | 'PLANNED' | 'IN_PROGRESS' | 'QA' | 'DONE';
  checklist: Array<{ id: string; label: string; done: boolean }>;
  notes: Array<{ by: string; text: string; ts: string }>;
};

export default function ECMHubPage() {
  const [tab, setTab] = useState<'gov' | 'dev' | 'planner' | 'delivery'>('gov');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [wos, setWos] = useState<WO[]>([]);
  const [capacity, setCapacity] = useState<
    Array<{ depotId: string; date: string; count: number; warning: boolean }>
  >([]);
  useEffect(() => {
    fetch('/api/ecm/policies')
      .then((r) => r.json())
      .then(setPolicies);
    fetch('/api/ecm/measures')
      .then((r) => r.json())
      .then(setMeasures);
    fetch('/api/ecm/wos')
      .then((r) => r.json())
      .then((res) => {
        if (Array.isArray(res?.items)) {
          setWos(res.items);
        } else {
          setWos(res);
        }
        setCapacity(res.capacity ?? []);
      });
  }, []);
  const addSignoff = async (policyId: string) => {
    await fetch('/api/ecm/signoff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: crypto.randomUUID(), policyId, author: 'system' }),
    });
  };
  const addWO = async () => {
    const wo: WO = {
      id: crypto.randomUUID(),
      trainId: 'RE8-79021',
      title: 'Sichtprüfung',
      dueDate: new Date(Date.now() + 3 * 864e5).toISOString(),
      priority: 'P1',
      depotId: 'Essingen',
      status: 'NEW',
      checklist: [{ id: 'c1', label: 'Dach prüfen', done: false }],
      notes: [],
    };
    await fetch('/api/ecm/wos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(wo),
    });
    setWos([...wos, wo]);
  };
  const moveWO = async (id: string, status: WO['status']) => {
    await fetch(`/api/ecm/wos/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setWos(wos.map((w) => (w.id === id ? { ...w, status } : w)));
  };
  const toggleChecklist = async (id: string, itemId: string, done: boolean) => {
    await fetch(`/api/ecm/wos/${id}/checklist`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ itemId, done }),
    });
    setWos(
      wos.map((w) =>
        w.id === id
          ? { ...w, checklist: w.checklist.map((c) => (c.id === itemId ? { ...c, done } : c)) }
          : w
      )
    );
  };
  const completeQA = async (id: string) => {
    await fetch(`/api/ecm/wos/${id}/complete`, { method: 'POST' });
    setWos(
      wos.map((w) =>
        w.id === id
          ? {
              ...w,
              status: 'DONE',
              notes: [
                ...w.notes,
                { by: 'system', text: 'Complete + QA', ts: new Date().toISOString() },
              ],
            }
          : w
      )
    );
  };
  const exportWOCsv = () => {
    const header = ['ID', 'Zug', 'Titel', 'Fällig', 'Prio', 'Depot', 'Status'];
    const rows = wos.map((w) => [
      w.id,
      w.trainId,
      w.title,
      new Date(w.dueDate).toISOString().slice(0, 10),
      w.priority,
      w.depotId,
      w.status,
    ]);
    exportToCsv('workorders.csv', header, rows);
  };
  const PolicyCols: TableColumn<Policy>[] = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Titel' },
      { key: 'intervalDays', label: 'Interval (Tage)' },
    ],
    []
  );
  const MeasuresCols: TableColumn<Measure>[] = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Titel' },
      { key: 'component', label: 'Komponente' },
    ],
    []
  );
  const WOCols: TableColumn<WO>[] = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'trainId', label: 'Zug' },
      { key: 'title', label: 'Titel' },
      { key: 'dueDate', label: 'Fällig' },
      { key: 'priority', label: 'Prio' },
      { key: 'depotId', label: 'Depot' },
      { key: 'status', label: 'Status' },
    ],
    []
  );
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-4">ECM Hub</h1>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('gov')}
          className={`px-3 py-2 rounded ${tab === 'gov' ? 'bg-white/20' : 'bg-white/10'}`}
        >
          ECM‑1 Governance
        </button>
        <button
          onClick={() => setTab('dev')}
          className={`px-3 py-2 rounded ${tab === 'dev' ? 'bg-white/20' : 'bg-white/10'}`}
        >
          ECM‑2 Development
        </button>
        <button
          onClick={() => setTab('planner')}
          className={`px-3 py-2 rounded ${tab === 'planner' ? 'bg-white/20' : 'bg-white/10'}`}
        >
          ECM‑3 Planner
        </button>
        <button
          onClick={() => setTab('delivery')}
          className={`px-3 py-2 rounded ${tab === 'delivery' ? 'bg-white/20' : 'bg-white/10'}`}
        >
          ECM‑4 Delivery
        </button>
      </div>
      {tab === 'gov' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Policies</h2>
            <button
              onClick={() => addSignoff(policies[0]?.id || 'pol-1')}
              className="px-3 py-2 bg-white/10 rounded"
            >
              Sign‑Off
            </button>
          </div>
          <TableView rows={policies} columns={PolicyCols} />
        </div>
      )}
      {tab === 'dev' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Maßnahmen</h2>
          </div>
          <TableView rows={measures} columns={MeasuresCols} />
        </div>
      )}
      {tab === 'planner' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Work Orders</h2>
            <div className="flex gap-2">
              <button onClick={addWO} className="px-3 py-2 bg-white/10 rounded">
                WO anlegen
              </button>
              <button onClick={exportWOCsv} className="px-3 py-2 bg-white/10 rounded">
                CSV
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {(['NEW', 'PLANNED', 'IN_PROGRESS', 'QA', 'DONE'] as const).map((col) => (
              <div key={col} className="bg-black/30 border border-white/10 rounded p-2">
                <div className="text-xs font-semibold mb-2">{col}</div>
                <div className="space-y-2 min-h-[200px]">
                  {wos
                    .filter((w) => w.status === col)
                    .map((w) => (
                      <div
                        key={w.id}
                        className="bg-black/40 rounded p-2 text-xs cursor-pointer hover:bg-black/50"
                        onClick={() =>
                          moveWO(
                            w.id,
                            col === 'NEW'
                              ? 'PLANNED'
                              : col === 'PLANNED'
                                ? 'IN_PROGRESS'
                                : col === 'IN_PROGRESS'
                                  ? 'QA'
                                  : 'DONE'
                          )
                        }
                      >
                        <div className="font-medium">{w.title}</div>
                        <div className="text-euco-muted">
                          {w.trainId} • fällig {new Date(w.dueDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-white/10">{w.priority}</span>
                          <span
                            title="Kapazitätswarnung möglich"
                            className={`px-1.5 py-0.5 rounded ${capacity.find((c) => c.depotId === w.depotId && c.date.startsWith(new Date(w.dueDate).toISOString().slice(0, 10)) && c.warning) ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-white/10'}`}
                          >
                            {w.depotId}
                          </span>
                        </div>
                        {w.checklist?.length ? (
                          <ul className="mt-2 space-y-1">
                            {w.checklist.map((c) => (
                              <li key={c.id} className="flex items-center gap-2">
                                <input
                                  aria-label="Checklist Item"
                                  type="checkbox"
                                  checked={c.done}
                                  onChange={(e) =>
                                    toggleChecklist(w.id, c.id, e.currentTarget.checked)
                                  }
                                />
                                <span>{c.label}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {col === 'QA' && (
                          <div className="mt-2 text-right">
                            <button
                              className="px-2 py-1 bg-white/10 rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                completeQA(w.id);
                              }}
                            >
                              Complete + QA
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-black/30 border border-white/10 rounded p-3">
            <div className="text-sm font-semibold mb-2">Depot‑Kapazität (Warnungen)</div>
            <ul className="text-xs space-y-1">
              {capacity.map((c) => (
                <li
                  key={`${c.depotId}-${c.date}`}
                  className={c.warning ? 'text-red-300' : 'text-white/70'}
                >
                  {c.depotId} {c.date.slice(0, 10)} — {c.count} WO{c.count !== 1 ? 's' : ''}{' '}
                  {c.warning ? '(warning)' : ''}
                </li>
              ))}
              {capacity.length === 0 && <li className="text-white/50">Keine Warnungen</li>}
            </ul>
          </div>
        </div>
      )}
      {tab === 'delivery' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Ausführung</h2>
          </div>
          <TableView rows={wos} columns={WOCols} onRowClick={(w) => moveWO((w as WO).id, 'DONE')} />
        </div>
      )}
    </div>
  );
}
