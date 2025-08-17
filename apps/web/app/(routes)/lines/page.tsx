"use client";
import { useEffect, useMemo, useState } from 'react';
import { TableView } from '@/components/table/TableView';

export default function LinesPage() {
  const [lines, setLines] = useState<any[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    fetch('/api/lines').then(r => r.json()).then(arr => setLines(Array.isArray(arr) ? arr : []));
  }, []);
  const filtered = lines.filter(l => !q || String(l.id || l.name).toLowerCase().includes(q.toLowerCase()));
  const columns = useMemo(() => [
    { key: 'id', label: 'Line' },
    { key: 'region', label: 'Region' },
    { key: 'operator', label: 'Operator' },
  ], []);
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Linien</h1>
      <div className="flex gap-2 items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suche Linie…" className="bg-black/30 border border-white/10 rounded px-3 py-2 outline-none" />
        <button onClick={() => {
          const csv = ['Line,Region,Operator', ...filtered.map((l) => `${l.id ?? ''},${l.region ?? ''},${l.operator ?? ''}`)].join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'lines.csv'; a.click(); URL.revokeObjectURL(url);
        }} className="bg-white/10 border border-white/10 rounded px-3 py-2">CSV Export</button>
      </div>
      <div className="mt-4">
        <TableView rows={filtered} columns={columns} />
      </div>
    </div>
  );
}


