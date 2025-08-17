"use client";
import { useEffect, useMemo, useState } from 'react';
import { TableView } from '@/components/table/TableView';

export default function TrainsPage() {
  const [trains, setTrains] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';
    fetch(`${base}/api/trains`).then(r => r.json()).then(arr => setTrains(Array.isArray(arr) ? arr : []));
  }, []);
  const filtered = trains.filter(t => {
    const hit = !q || String(t.id).toLowerCase().includes(q.toLowerCase());
    const s = status === 'all' || String(t.status) === status;
    return hit && s;
  });
  const columns = useMemo(() => [
    { key: 'id', label: 'FZ' },
    { key: 'lineId', label: 'Linie' },
    { key: 'status', label: 'Status' },
    { key: 'depot', label: 'Depot' }
  ], []);
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Züge</h1>
      <div className="flex gap-2 items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suche FZ/Slot/UIC…" className="bg-black/30 border border-white/10 rounded px-3 py-2 outline-none" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-black/30 border border-white/10 rounded px-2 py-2">
          <option value="all">Alle</option>
          <option value="active">active</option>
          <option value="standby">standby</option>
          <option value="maintenance">maintenance</option>
        </select>
        <button onClick={() => {
          const csv = ['FZ,Linie,Status,Depot', ...filtered.map((t) => `${t.id},${t.lineId ?? ''},${t.status ?? ''},${t.depot ?? ''}`)].join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'trains.csv'; a.click(); URL.revokeObjectURL(url);
        }} className="bg-white/10 border border-white/10 rounded px-3 py-2">CSV Export</button>
      </div>
      <div className="mt-4">
        <TableView rows={filtered} columns={columns} />
      </div>
    </div>
  );
}


