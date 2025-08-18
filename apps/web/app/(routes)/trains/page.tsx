'use client';
import { useEffect, useMemo, useState } from 'react';
import { TableView, type TableColumn } from '@/components/table/TableView';
import TableHeaderControls from '@/components/TableHeaderControls';
import { exportToCsv, exportToXlsx } from '@/components/table/export';
import Link from 'next/link';
import { apiGet } from '@/lib/api-client';

type Train = {
  id: string;
  slot?: string;
  uic?: string;
  manufacturer?: string;
  series?: string;
  lineId?: string;
  status?: string;
  depot?: string;
  ecm?: 'OK' | 'DUE_SOON' | 'OVERDUE';
  nextMeasure?: string;
};

export default function TrainsPage() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [line, setLine] = useState<string>('all');
  const [savedViews, setSavedViews] = useState<Array<{ name: string; state: any }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('views:trains') || '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    (async () => {
      const r = await apiGet<any>('/trains?limit=500');
      const arr = r.ok
        ? Array.isArray((r.data as any).items)
          ? (r.data as any).items
          : Array.isArray(r.data)
            ? r.data
            : []
        : [];
      setTrains(arr);
    })();
  }, []);
  const normalizedQuery = useMemo(() => q.trim().toLowerCase(), [q]);
  const filtered = useMemo(
    () =>
      trains.filter((t) => {
        const hay = `${t.id ?? ''} ${t.slot ?? ''} ${t.uic ?? ''}`.toLowerCase();
        const hit = !normalizedQuery || hay.includes(normalizedQuery);
        const s = status === 'all' || String(t.status).toLowerCase() === status;
        const l = line === 'all' || String(t.lineId).toLowerCase() === line;
        return hit && s && l;
      }),
    [trains, normalizedQuery, status, line]
  );
  const [colState, setColState] = useState<Array<{ key: string; label: string; visible: boolean }>>(
    [
      { key: 'id', label: 'FZ', visible: true },
      { key: 'slot', label: 'Slot', visible: true },
      { key: 'uic', label: 'UIC', visible: true },
      { key: 'manufacturer', label: 'Hersteller', visible: true },
      { key: 'series', label: 'Serie', visible: true },
      { key: 'lineId', label: 'Linie', visible: true },
      { key: 'status', label: 'Status', visible: true },
      { key: 'depot', label: 'Depot', visible: true },
      { key: 'ecm', label: 'ECM', visible: true },
      { key: 'nextMeasure', label: 'Nächste Maßnahme', visible: true },
    ]
  );
  const columns: TableColumn<Train>[] = useMemo(
    () => [
      {
        key: 'id',
        label: 'FZ',
        width: 140,
        visible: colState.find((c) => c.key === 'id')?.visible !== false,
      },
      {
        key: 'slot',
        label: 'Slot',
        width: 100,
        visible: colState.find((c) => c.key === 'slot')?.visible !== false,
      },
      {
        key: 'uic',
        label: 'UIC',
        width: 140,
        visible: colState.find((c) => c.key === 'uic')?.visible !== false,
      },
      {
        key: 'manufacturer',
        label: 'Hersteller',
        width: 140,
        visible: colState.find((c) => c.key === 'manufacturer')?.visible !== false,
      },
      {
        key: 'series',
        label: 'Serie',
        width: 100,
        visible: colState.find((c) => c.key === 'series')?.visible !== false,
      },
      {
        key: 'lineId',
        label: 'Linie',
        width: 100,
        visible: colState.find((c) => c.key === 'lineId')?.visible !== false,
      },
      {
        key: 'status',
        label: 'Status',
        width: 110,
        visible: colState.find((c) => c.key === 'status')?.visible !== false,
      },
      {
        key: 'depot',
        label: 'Depot',
        width: 120,
        visible: colState.find((c) => c.key === 'depot')?.visible !== false,
      },
      {
        key: 'ecm',
        label: 'ECM',
        width: 110,
        visible: colState.find((c) => c.key === 'ecm')?.visible !== false,
      },
      {
        key: 'nextMeasure',
        label: 'Nächste Maßnahme',
        width: 220,
        visible: colState.find((c) => c.key === 'nextMeasure')?.visible !== false,
      },
    ],
    [colState]
  );
  const exportCsv = () => {
    const header = columns.map((c) => c.label);
    const rows = filtered.map((t) => columns.map((c) => (t as any)[c.key] ?? ''));
    exportToCsv(
      'trains.csv',
      header,
      rows.map((r) => r.map((v) => String(v ?? '')))
    );
  };
  const exportXlsx = async () => {
    const header = columns.map((c) => c.label);
    const rows = filtered.map((t) => columns.map((c) => (t as any)[c.key] ?? ''));
    await exportToXlsx('trains.xlsx', header, rows);
  };
  const onSaveView = () => {
    const name = prompt('View-Name');
    if (!name) return;
    const next = [
      ...savedViews,
      {
        name,
        state: {
          q,
          status,
          line,
          columns: columns.map((c) => ({ key: c.key, visible: c.visible !== false })),
        },
      },
    ];
    setSavedViews(next);
    localStorage.setItem('views:trains', JSON.stringify(next));
  };
  const onExportView = () => {
    const blob = new Blob([JSON.stringify(savedViews, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trains-views.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const onImportView = async () => {
    const text = prompt('View JSON einfügen:');
    if (!text) return;
    try {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('invalid');
      setSavedViews(arr);
      localStorage.setItem('views:trains', JSON.stringify(arr));
    } catch {
      alert('Ungültiges JSON');
    }
  };
  const onLoadView = (vName: string) => {
    const v = savedViews.find((v) => v.name === vName);
    if (!v) return;
    setQ(v.state.q ?? '');
    setStatus(v.state.status ?? 'all');
    setLine(v.state.line ?? 'all');
  };
  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Züge</h1>
        <div className="flex gap-2 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche FZ/Slot/UIC…"
            className="bg-black/30 border border-white/10 rounded px-3 py-2 outline-none"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-black/30 border border-white/10 rounded px-2 py-2"
          >
            <option value="all">Alle Stati</option>
            <option value="active">active</option>
            <option value="standby">standby</option>
            <option value="maintenance">maintenance</option>
          </select>
          <select
            value={line}
            onChange={(e) => setLine(e.target.value)}
            className="bg-black/30 border border-white/10 rounded px-2 py-2"
          >
            <option value="all">Alle Linien</option>
            {Array.from(new Set(trains.map((t) => String(t.lineId)))).map((l) => (
              <option key={l} value={l.toLowerCase()}>
                {l}
              </option>
            ))}
          </select>
          <TableHeaderControls storageKey="trains" columns={colState} onChange={setColState} />
          <button
            onClick={exportCsv}
            className="bg-white/10 border border-white/10 rounded px-3 py-2"
          >
            CSV
          </button>
          <button
            onClick={exportXlsx}
            className="bg-white/10 border border-white/10 rounded px-3 py-2"
          >
            XLSX
          </button>
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => onLoadView(e.target.value)}
              defaultValue="__none__"
              className="bg-black/30 border border-white/10 rounded px-2 py-2"
            >
              <option value="__none__">Views…</option>
              {savedViews.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
            <button
              onClick={onSaveView}
              className="bg-white/10 border border-white/10 rounded px-3 py-2"
            >
              Speichern
            </button>
            <button
              onClick={onExportView}
              className="bg-white/10 border border-white/10 rounded px-3 py-2"
            >
              Export
            </button>
            <button
              onClick={onImportView}
              className="bg-white/10 border border-white/10 rounded px-3 py-2"
            >
              Import
            </button>
          </div>
        </div>
      </div>
      <div className="mt-2">
        {filtered.length === 0 ? (
          <div className="text-sm text-white/70 bg-black/30 rounded p-4">
            Keine Einträge.{' '}
            <button
              className="underline"
              onClick={() => {
                setQ('');
                setStatus('all');
                setLine('all');
              }}
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <TableView
            rows={filtered}
            columns={columns}
            onRowClick={(row) => window.open(`/trains/${(row as any).id}`, '_blank')}
          />
        )}
      </div>
    </div>
  );
}
