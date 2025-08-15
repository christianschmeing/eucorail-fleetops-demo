"use client";
import { useEffect, useState } from 'react';

type MaintItem = { component: string; dueAtKm: number; lastServiceKm: number; status: 'ok'|'due-soon'|'overdue' };
type Fault = { code: string; subsystem: string; severity: 'info'|'minor'|'major'|'critical'; since: number; message: string };

export default function TrainPopup({ trainId, onClose }: { trainId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ unitType: string; schedule: MaintItem[]; next: { type: string; atKm: number }; wearPct: number; faults: Fault[] } | null>(null);
  const api = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${api}/api/maintenance/${encodeURIComponent(trainId)}`).then(async (r) => {
      const j = await r.json();
      if (!alive) return;
      setData(j);
      setError(null);
    }).catch((e) => {
      if (!alive) return;
      setError(String(e?.message ?? e));
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [trainId, api]);

  if (loading) return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[520px] bg-[#0B1F2A]/95 border border-[#2A3F4A] rounded-lg shadow-xl p-4">
      <div className="text-sm text-gray-300">Lade Wartungsdaten…</div>
    </div>
  );
  if (error) return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[520px] bg-[#300]/90 border border-red-700 rounded-lg shadow-xl p-4">
      <div className="text-sm text-red-200">Fehler: {error}</div>
    </div>
  );
  if (!data) return null;

  const badge = (s: MaintItem['status']) => s === 'ok' ? 'bg-green-500/20 text-green-300 border-green-600/30' : s === 'due-soon' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-600/30' : 'bg-red-500/20 text-red-300 border-red-600/30';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[640px] bg-[#0B1F2A]/95 border border-[#2A3F4A] rounded-lg shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A3F4A]">
        <div>
          <div className="text-sm text-gray-400">Wartung & Zustand</div>
          <div className="text-lg font-semibold">{trainId} · {data.unitType}</div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">×</button>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-semibold mb-2">Aktuelle Störungen (Türen)</div>
          {data.faults.length === 0 ? (
            <div className="text-xs text-gray-400">Keine aktuellen Tür-Störungen</div>
          ) : (
            <ul className="space-y-2">
              {data.faults.map(f => (
                <li key={f.code+f.since} className="text-xs">
                  <div className={`inline-block px-2 py-0.5 rounded border mr-2 ${f.severity==='critical'?'bg-red-600/30 border-red-700 text-red-200':f.severity==='major'?'bg-yellow-600/30 border-yellow-700 text-yellow-200':'bg-white/10 border-white/20 text-white'}`}>{f.code}</div>
                  <span className="text-gray-300">{f.message}</span>
                  <span className="text-gray-500 ml-2">seit {new Date(f.since).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">Verschleiß</div>
          <div className="w-full bg-white/10 rounded h-2">
            <div className="bg-yellow-400 h-2 rounded" style={{ width: `${data.wearPct}%` }} />
          </div>
          <div className="text-xs text-gray-400 mt-1">{data.wearPct}% geschätzt</div>
          <div className="text-sm font-semibold mt-4 mb-2">Nächste Wartung</div>
          <div className="text-xs text-gray-300">{data.next.type} bei {data.next.atKm.toLocaleString()} km</div>
        </div>
        <div className="col-span-2">
          <div className="text-sm font-semibold mb-2">Wartungsplan</div>
          <table className="w-full text-xs">
            <thead className="text-gray-400">
              <tr><th className="text-left py-1">Stufe</th><th className="text-left">Letzter Service (km)</th><th className="text-left">Fällig bei (km)</th><th className="text-left">Status</th></tr>
            </thead>
            <tbody>
              {data.schedule.map(it => (
                <tr key={it.component} className="border-t border-white/10">
                  <td className="py-2">{it.component}</td>
                  <td>{it.lastServiceKm.toLocaleString()}</td>
                  <td>{it.dueAtKm.toLocaleString()}</td>
                  <td><span className={`px-2 py-0.5 rounded border ${badge(it.status)}`}>{it.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3">
            <button className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded" onClick={() => window.open('https://www.eucorail.de', '_blank')}>Eucorail Handbuch (extern)</button>
          </div>
        </div>
      </div>
    </div>
  );
}


