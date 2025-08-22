'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export type MapFilters = {
  region: Array<'BW' | 'BY'>;
  lines: string[];
  status: Array<'active' | 'maintenance' | 'alarm' | 'offline' | 'reserve'>;
  reserve: 0 | 1;
  q: string;
};

export function MapFiltersBar({
  linesOptions,
  onChange,
}: {
  linesOptions: string[];
  onChange: (f: MapFilters) => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [region, setRegion] = useState<Array<'BW' | 'BY'>>(['BW', 'BY']);
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<
    Array<'active' | 'maintenance' | 'alarm' | 'offline' | 'reserve'>
  >(['active', 'maintenance', 'alarm', 'offline']);
  const [reserve, setReserve] = useState<0 | 1>(1);
  const [q, setQ] = useState('');

  // parse on mount
  useEffect(() => {
    const r = (params?.get('region') || '').split(',').filter(Boolean) as Array<'BW' | 'BY'>;
    const l = (params?.get('lines') || '').split(',').filter(Boolean);
    const s = (params?.get('status') || '').split(',').filter(Boolean) as Array<
      'active' | 'maintenance' | 'alarm' | 'offline' | 'reserve'
    >;
    const rv = params?.get('reserve');
    const qv = params?.get('q') || '';
    if (r.length) setRegion(r);
    if (l.length) setLines(l);
    if (s.length) setStatus(s);
    if (rv === '0' || rv === '1') setReserve(rv === '1' ? 1 : 0);
    if (qv) setQ(qv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // build filters and propagate + write URL
  const filters = useMemo<MapFilters>(
    () => ({ region, lines, status, reserve, q }),
    [region, lines, status, reserve, q]
  );

  useEffect(() => {
    onChange(filters);
    try {
      const url = new URL(window.location.href);
      if (region.length && region.length < 2) url.searchParams.set('region', region.join(','));
      else url.searchParams.delete('region');
      if (lines.length) url.searchParams.set('lines', lines.join(','));
      else url.searchParams.delete('lines');
      if (status.length && status.length < 5) url.searchParams.set('status', status.join(','));
      else url.searchParams.delete('status');
      url.searchParams.set('reserve', String(reserve));
      if (q) url.searchParams.set('q', q);
      else url.searchParams.delete('q');
      const next = url.toString();
      if (next !== window.location.href) window.history.replaceState({}, '', next);
    } catch {}
  }, [filters, onChange, region, lines, status, reserve, q]);

  const toggle = <T extends string>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <div className="mt-4 flex flex-wrap gap-4 items-start">
      <div className="flex gap-2 items-center">
        <span className="text-sm text-gray-400">Bundesland:</span>
        {(['BW', 'BY'] as const).map((r) => (
          <label key={r} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={region.includes(r)}
              onChange={() => setRegion(toggle(region, r))}
              className="rounded"
            />
            <span className="text-sm text-white">{r}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm text-gray-400">Linien</div>
        <div className="flex flex-wrap gap-2 max-w-[720px]">
          {linesOptions.map((id) => (
            <label key={id} className="flex items-center gap-1" data-testid={`line-chip-${id}`}>
              <input
                type="checkbox"
                checked={lines.includes(id)}
                onChange={() => setLines(toggle(lines, id))}
                className="rounded"
              />
              <span className="text-sm text-gray-200">{id}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-sm text-gray-400">Status:</span>
        {(['active', 'maintenance', 'alarm', 'offline'] as const).map((s) => (
          <label key={s} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={status.includes(s)}
              onChange={() => setStatus(toggle(status, s))}
              className="rounded"
            />
            <span className="text-sm text-white">
              {s === 'active'
                ? 'Aktiv'
                : s === 'maintenance'
                  ? 'Wartung'
                  : s === 'alarm'
                    ? 'Alarm'
                    : 'Offline'}
            </span>
          </label>
        ))}
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={reserve === 1}
          onChange={() => setReserve(reserve === 1 ? 0 : 1)}
          className="rounded"
        />
        <span className="text-sm text-white">Reserve einbeziehen</span>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zug-ID suchen"
          className="px-2 py-1 text-sm bg-gray-800 text-white border border-gray-700 rounded"
          aria-label="Zug-ID Suche"
        />
      </div>
    </div>
  );
}
