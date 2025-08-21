'use client';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export function Sidebar({
  activeLines,
  setActiveLines,
  isTestMode,
  selectedTrain,
  onSelect,
}: {
  activeLines: string[];
  setActiveLines: Dispatch<SetStateAction<string[]>>;
  isTestMode: boolean;
  selectedTrain: string | null;
  onSelect: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'standby' | 'maintenance'>(
    'ALL'
  );
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [trains, setTrains] = useState<
    Array<{ id: string; line: string; status: string; speed: number; region?: 'BW' | 'BY' }>
  >([]);

  const regionFromFleetId = (fleetId?: string): 'BW' | 'BY' | undefined => {
    const id = fleetId || '';
    if (id.endsWith('-bw')) return 'BW';
    if (id.endsWith('-by')) return 'BY';
    return undefined;
  };

  // Load lines list from API to render real filter chips
  const { data: lines } = useQuery({
    queryKey: ['lines'],
    queryFn: () => apiGet<Array<{ id: string; region: string; name: string }>>('/api/lines'),
    staleTime: 5 * 60 * 1000,
  });
  // Load full trains list from API to ensure complete catalog (fallback if SSE not yet ready)
  const { data: trainCatalog } = useQuery({
    queryKey: ['trains', 'catalog'],
    queryFn: () =>
      apiGet<Array<{ id: string; lineId: string; status?: string; fleetId?: string }>>(
        '/api/trains'
      ),
    staleTime: 30 * 1000,
  });

  const recompute = () => {
    const fc = qc.getQueryData<any>(['trains', 'live']);
    const features = Array.isArray(fc?.features) ? fc.features : [];
    const liveById = new Map<string, any>();
    for (const f of features) {
      const id = String(f?.properties?.id ?? '');
      if (id) liveById.set(id, f);
    }
    let list: Array<{
      id: string;
      line: string;
      status: string;
      speed: number;
      region?: 'BW' | 'BY';
    }> = [];
    if (Array.isArray(trainCatalog) && trainCatalog.length > 0) {
      list = trainCatalog.map((t) => {
        const live = liveById.get(t.id);
        const region = regionFromFleetId(t.fleetId);
        return {
          id: t.id,
          line: String(t.lineId || '').toUpperCase(),
          status: String(live?.properties?.status ?? t.status ?? 'active'),
          speed: Number(live?.properties?.speed ?? 0),
          region,
        };
      });
    } else {
      list = features
        .map((f: any) => ({
          id: String(f?.properties?.id ?? ''),
          line: String(f?.properties?.line ?? '').toUpperCase(),
          status: String(f?.properties?.status ?? 'active'),
          speed: Number(f?.properties?.speed ?? 0),
        }))
        .filter((t: any) => t.id);
    }
    list.sort((a: any, b: any) => a.id.localeCompare(b.id));
    setTrains(list);
  };

  useEffect(() => {
    // initial and on every trains:update event (SSE) recompute list
    recompute();
    const handler = () => recompute();
    window.addEventListener('trains:update', handler as any);
    return () => window.removeEventListener('trains:update', handler as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainCatalog]);

  // Extra safety: if after a short delay we still have 0 entries, load catalog directly
  useEffect(() => {
    if (trains.length > 0) return;
    const fetchCatalog = async () => {
      try {
        const base =
          (typeof window !== 'undefined' && (window as any).__apiBase) ||
          process.env.NEXT_PUBLIC_API_BASE ||
          'http://localhost:4100';
        // try relative first (in case a reverse proxy is in front), then absolute
        let arr: any = null;
        try {
          const r1 = await fetch(`/api/trains`, { cache: 'no-store' });
          if (r1.ok) arr = await r1.json();
        } catch {}
        if (!Array.isArray(arr)) {
          const r2 = await fetch(`${base}/api/trains`, { cache: 'no-store' });
          if (r2.ok) arr = await r2.json();
        }
        if (!Array.isArray(arr)) return;
        if (Array.isArray(arr) && arr.length > 0) {
          const seeded: Array<{
            id: string;
            line: string;
            status: string;
            speed: number;
            region?: 'BW' | 'BY';
          }> = arr.map((t: any) => ({
            id: String(t.id),
            line: String(t.lineId || '').toUpperCase(),
            status: String(t.status || 'active'),
            speed: 0,
            region: regionFromFleetId(t.fleetId),
          }));
          seeded.sort((a, b) => a.id.localeCompare(b.id));
          setTrains(seeded);
        }
      } catch {}
    };
    // immediate attempt and a backup retry shortly after
    fetchCatalog();
    const retry = setTimeout(() => {
      if (trains.length === 0) fetchCatalog();
    }, 1200);
    return () => clearTimeout(retry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trains.length]);

  const lineChips = useMemo(() => {
    // Prefer API-provided lines; fall back to lines from SSE trains if needed
    const set = new Set<string>();
    if (Array.isArray(lines) && lines.length > 0) {
      for (const ln of lines) set.add(ln.id.toUpperCase());
    } else {
      for (const t of trains) if (t.line) set.add(t.line.toUpperCase());
    }
    if (set.size === 0)
      [
        'RE9',
        'RE8',
        'MEX16',
        'RE1',
        'RE90',
        'RE72',
        'RE96',
        'RB92',
        'RE80',
        'RE89',
        'RB86',
        'RB87',
        'RB89',
      ].forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [lines, trains]);

  const regionChips = useMemo(() => {
    const set = new Set<string>();
    const cat = Array.isArray(trainCatalog) && trainCatalog.length > 0 ? trainCatalog : undefined;
    if (cat) {
      for (const t of cat) {
        if ((t.fleetId || '').endsWith('-bw')) set.add('BW');
        if ((t.fleetId || '').endsWith('-by')) set.add('BY');
      }
    } else {
      for (const t of trains) if (t.region) set.add(t.region);
    }
    return Array.from(set).sort();
  }, [trainCatalog, trains]);

  const typeChips = useMemo(() => {
    const set = new Set<string>();
    for (const t of Array.isArray(trainCatalog) ? trainCatalog : []) {
      if ((t as any).typeKey) set.add(String((t as any).typeKey));
      else if ((t as any).series) set.add(String((t as any).series));
    }
    return Array.from(set).sort();
  }, [trainCatalog]);

  // Fallback: if no trains yet but catalog is available, seed from catalog
  useEffect(() => {
    if (trains.length === 0 && Array.isArray(trainCatalog) && trainCatalog.length > 0) {
      const seeded: Array<{
        id: string;
        line: string;
        status: string;
        speed: number;
        region?: 'BW' | 'BY';
      }> = trainCatalog.map((t: any) => ({
        id: String(t.id),
        line: String(t.lineId || '').toUpperCase(),
        status: String(t.status || 'active'),
        speed: 0,
        region: regionFromFleetId(t.fleetId),
      }));
      seeded.sort((a, b) => a.id.localeCompare(b.id));
      setTrains(seeded);
    }
  }, [trainCatalog, trains.length]);

  // Derived, filtered, grouped view model
  const filtered = useMemo(() => {
    const base = trains.length > 0 ? trains : [];
    const q = query.trim().toLowerCase();
    return base
      .filter((t) => activeLines.length === 0 || activeLines.includes(t.line))
      .filter((t) => (statusFilter === 'ALL' ? true : t.status === statusFilter))
      .filter((t) =>
        regionFilter.length === 0 ? true : t.region ? regionFilter.includes(t.region) : true
      )
      .filter((t) =>
        typeFilter.length === 0
          ? true
          : (() => {
              const match = (Array.isArray(trainCatalog) ? (trainCatalog as any) : []).find(
                (x: any) => x.id === t.id
              );
              const keyOrSeries = match?.typeKey || match?.series;
              return keyOrSeries ? typeFilter.includes(String(keyOrSeries)) : true;
            })()
      )
      .filter(
        (t) => q === '' || t.id.toLowerCase().includes(q) || t.line.toLowerCase().includes(q)
      );
  }, [trains, activeLines, statusFilter, regionFilter, typeFilter, query, trainCatalog]);

  const groupedByLine = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const key = t.line || '–';
      if (!map.has(key)) map.set(key, [] as any);
      (map.get(key) as any).push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <aside
      className="w-80 bg-black/30 border-r border-white/10 overflow-y-auto flex-shrink-0"
      data-testid="sidebar"
      style={{ minWidth: '320px', display: 'block' }}
    >
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Zugliste</h2>
        <div className="mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen… (ID, Linie)"
            className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-euco-accent"
          />
        </div>
        <div
          className="grid grid-cols-4 gap-2 mb-3"
          role="group"
          aria-label="Status"
          style={{ display: 'grid' }}
        >
          {['ALL', 'active', 'standby', 'maintenance'].map((s) => (
            <button
              key={s}
              className={`${statusFilter === s ? 'bg-euco-accent text-black' : 'bg-black/30 hover:bg-white/10'} px-2 py-2 rounded-xl text-xs transition-colors`}
              onClick={() => setStatusFilter(s as any)}
            >
              {s === 'ALL' ? 'Alle' : s}
            </button>
          ))}
        </div>
        <div
          className="flex flex-wrap gap-2 mb-2"
          role="group"
          aria-label="Region"
          style={{ display: 'flex' }}
        >
          {regionChips.map((r) => (
            <button
              key={r}
              className={`${regionFilter.includes(r) ? 'bg-euco-accent text-black' : 'bg-black/30 hover:bg-white/10'} px-3 py-1 rounded-xl text-xs transition-colors`}
              onClick={() =>
                setRegionFilter((prev) =>
                  prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
                )
              }
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Zugtyp">
          {typeChips.map((t) => (
            <button
              key={t}
              className={`${typeFilter.includes(t) ? 'bg-euco-accent text-black' : 'bg-black/30 hover:bg-white/10'} px-3 py-1 rounded-xl text-xs transition-colors`}
              onClick={() =>
                setTypeFilter((prev) =>
                  prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                )
              }
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {lineChips.map((code) => (
            <button
              key={code}
              className={`${activeLines.includes(code) ? 'bg-euco-accent text-black' : 'bg-black/30 hover:bg-white/10'} px-3 py-1 rounded-xl text-xs transition-colors`}
              onClick={() =>
                setActiveLines((prev) =>
                  prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
                )
              }
            >
              {code}
            </button>
          ))}
        </div>
        <div className="text-xs text-euco-muted mb-2">{filtered.length} Fahrzeuge</div>
        <div className="space-y-3" data-testid="train-list">
          {groupedByLine.length === 0 && (
            <div className="text-sm text-euco-muted">Keine Fahrzeuge gefunden.</div>
          )}
          {groupedByLine.map(([lineCode, items]) => (
            <div key={lineCode} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="text-xs uppercase tracking-wider text-euco-muted">{lineCode}</div>
                <div className="text-xs text-euco-muted">{items.length}</div>
              </div>
              {items.map((train: any) => (
                <div
                  key={train.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTrain === train.id
                      ? 'bg-euco-accent text-black'
                      : 'bg-black/30 hover:bg-white/10'
                  }`}
                  data-testid="train-item"
                  onClick={() => onSelect(train.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{train.id}</div>
                      <div className="text-xs opacity-75">
                        {train.status === 'active' ? `${train.speed} km/h` : train.status}
                      </div>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        train.status === 'active'
                          ? 'bg-green-400'
                          : train.status === 'maintenance'
                            ? 'bg-yellow-400'
                            : train.status === 'inspection'
                              ? 'bg-red-400'
                              : 'bg-gray-400'
                      }`}
                    ></div>
                  </div>
                  {isTestMode && (
                    <div className="mt-2">
                      <button
                        type="button"
                        data-testid="open-details"
                        className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(train.id);
                        }}
                        aria-label={`Details anzeigen für ${train.id}`}
                      >
                        Details anzeigen
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
