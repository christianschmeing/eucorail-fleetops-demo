'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Map,
  Route,
  Train,
  Wrench,
  ShieldCheck,
  ScrollText,
  Search,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: any; hotkey?: string };

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hotkey: 'g d' },
  { href: '/map', label: 'Map', icon: Map, hotkey: 'g m' },
  { href: '/lines', label: 'Linien', icon: Route, hotkey: 'g l' },
  { href: '/trains', label: 'Züge', icon: Train, hotkey: 'g t' },
  { href: '/maintenance', label: 'Wartung', icon: Wrench, hotkey: 'g w' },
  { href: '/ecm', label: 'ECM', icon: ShieldCheck, hotkey: 'g e' },
  { href: '/log', label: 'Protokoll', icon: ScrollText, hotkey: 'g p' },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; lineId?: string }[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey || e.metaKey ? 'g ' : ''}${e.key.toLowerCase()}`.trim();
      const hit = NAV_ITEMS.find((n) => n.hotkey?.endsWith(key));
      if (hit) {
        e.preventDefault();
        router.push(hit.href);
      }
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === '/') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    if (!paletteOpen || q.length < 2) {
      setResults([]);
      return;
    }
    const run = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';
        const r = await fetch(`${base}/api/trains`);
        const arr = await r.json();
        if (cancelled) return;
        const filtered = arr
          .filter((t: any) => String(t.id).toLowerCase().includes(q.toLowerCase()))
          .slice(0, 20);
        setResults(filtered);
      } catch {
        setResults([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [paletteOpen, q]);

  return (
    <aside className="w-60 bg-black/40 border-r border-white/10 h-full flex flex-col">
      <div className="p-4 border-b border-white/10 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg grid place-items-center font-bold">
          E
        </div>
        <div className="text-sm">
          <div className="font-semibold">Eucorail</div>
          <div className="text-white/60">FleetOps</div>
        </div>
      </div>
      <nav className="p-2 flex-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const ActiveIcon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors mb-1 ${active ? 'bg-white/10 border-white/20' : 'border-white/10 hover:bg-white/5'}`}
            >
              <ActiveIcon className="w-4 h-4 text-white/80" />
              <span className="text-sm">{item.label}</span>
              {item.hotkey && (
                <span className="ml-auto text-[10px] text-white/40 border border-white/10 rounded px-1">
                  {item.hotkey}
                </span>
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setPaletteOpen(true)}
          className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5"
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Suchen (⌘K, /)</span>
        </button>
      </nav>

      {paletteOpen && (
        <div
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="absolute left-1/2 top-24 -translate-x-1/2 w-[600px] bg-[#0B1F2A] border border-white/10 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-white/10 flex items-center gap-2">
              <Search className="w-4 h-4 text-white/60" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Suche: Zug-ID, Linie…"
                className="flex-1 bg-transparent outline-none text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto">
              {results.length === 0 && (
                <div className="p-3 text-sm text-white/60">Keine Treffer</div>
              )}
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setPaletteOpen(false);
                    router.push(`/trains?select=${encodeURIComponent(r.id)}`);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/5"
                >
                  <div className="text-sm font-medium">{r.id}</div>
                  <div className="text-xs text-white/50">Linie: {r.lineId ?? '–'}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
