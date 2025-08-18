'use client';
import { useEffect, useMemo, useState } from 'react';
import { TableView, type TableColumn } from '@/components/table/TableView';
import TableHeaderControls from '@/components/TableHeaderControls';
import { exportToCsv, exportToXlsx } from '@/components/table/export';
import { apiGet } from '@/lib/api-client';

type Line = {
  id: string;
  name?: string;
  region?: string;
  operator?: string;
  total?: number;
  active?: number;
  standby?: number;
  maintenance?: number;
  overduePct?: number;
};

export default function LinesPage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<string>('all');
  const [savedViews, setSavedViews] = useState<Array<{ name: string; state: any }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('views:lines') || '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    (async () => {
      const r = await apiGet<any>('/lines');
      const arr = r.ok && Array.isArray(r.data) ? r.data : [];
      setLines(arr);
    })();
  }, []);
  const filtered = useMemo(
    () =>
      lines.filter(
        (l) =>
          (!q ||
            String(l.id || l.name)
              .toLowerCase()
              .includes(q.toLowerCase())) &&
          (region === 'all' || String(l.region).toLowerCase() === region)
      ),
    [lines, q, region]
  );
  const [colState, setColState] = useState<Array<{ key: string; label: string; visible: boolean }>>(
    [
      { key: 'id', label: 'Line', visible: true },
      { key: 'region', label: 'Region', visible: true },
      { key: 'operator', label: 'Operator', visible: true },
      { key: 'total', label: 'Züge gesamt', visible: true },
      { key: 'active', label: 'Aktiv', visible: true },
      { key: 'standby', label: 'Standby', visible: true },
      { key: 'maintenance', label: 'Wartung', visible: true },
      { key: 'overduePct', label: 'Overdue %', visible: true },
    ]
  );
  const columns: TableColumn<Line>[] = useMemo(
    () => [
      {
        key: 'id',
        label: 'Line',
        width: 160,
        visible: colState.find((c) => c.key === 'id')?.visible !== false,
      },
      {
        key: 'region',
        label: 'Region',
        width: 80,
        visible: colState.find((c) => c.key === 'region')?.visible !== false,
      },
      {
        key: 'operator',
        label: 'Operator',
        width: 120,
        visible: colState.find((c) => c.key === 'operator')?.visible !== false,
      },
      {
        key: 'total',
        label: 'Züge gesamt',
        width: 120,
        visible: colState.find((c) => c.key === 'total')?.visible !== false,
      },
      {
        key: 'active',
        label: 'Aktiv',
        width: 80,
        visible: colState.find((c) => c.key === 'active')?.visible !== false,
      },
      {
        key: 'standby',
        label: 'Standby',
        width: 90,
        visible: colState.find((c) => c.key === 'standby')?.visible !== false,
      },
      {
        key: 'maintenance',
        label: 'Wartung',
        width: 100,
        visible: colState.find((c) => c.key === 'maintenance')?.visible !== false,
      },
      {
        key: 'overduePct',
        label: 'Overdue %',
        width: 100,
        visible: colState.find((c) => c.key === 'overduePct')?.visible !== false,
      },
    ],
    [colState]
  );
  const exportCsv = () => {
    const header = columns.map((c) => c.label);
    const rows = filtered.map((l) => columns.map((c) => (l as any)[c.key] ?? ''));
    exportToCsv(
      'lines.csv',
      header,
      rows.map((r) => r.map((v) => String(v ?? '')))
    );
  };
  const exportXlsx = async () => {
    const header = columns.map((c) => c.label);
    const rows = filtered.map((l) => columns.map((c) => (l as any)[c.key] ?? ''));
    await exportToXlsx('lines.xlsx', header, rows);
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
          region,
          columns: columns.map((c) => ({ key: c.key, visible: c.visible !== false })),
        },
      },
    ];
    setSavedViews(next);
    localStorage.setItem('views:lines', JSON.stringify(next));
  };
  const onLoadView = (vName: string) => {
    const v = savedViews.find((v) => v.name === vName);
    if (!v) return;
    setQ(v.state.q ?? '');
    setRegion(v.state.region ?? 'all');
  };
  const onExportView = () => {
    const blob = new Blob([JSON.stringify(savedViews, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lines-views.json';
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
      localStorage.setItem('views:lines', JSON.stringify(arr));
    } catch {
      alert('Ungültiges JSON');
    }
  };
  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Linien</h1>
        <div className="flex gap-2 items-center">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-black/30 border border-white/10 rounded px-2 py-2"
          >
            <option value="all">Alle Regionen</option>
            <option value="bw">BW</option>
            <option value="by">BY</option>
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche Linie…"
            className="bg-black/30 border border-white/10 rounded px-3 py-2 outline-none"
          />
          <TableHeaderControls storageKey="lines" columns={colState} onChange={setColState} />
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
                setRegion('all');
              }}
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <TableView rows={filtered} columns={columns} />
        )}
      </div>
    </div>
  );
}
