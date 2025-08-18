'use client';
import { useEffect, useState } from 'react';

type ColumnState = { key: string; label: string; visible: boolean };

export default function TableHeaderControls({
  storageKey,
  columns,
  onChange,
}: {
  storageKey: string;
  columns: ColumnState[];
  onChange: (next: ColumnState[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ColumnState[]>(columns);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`cols:${storageKey}`);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved))
          setState((prev) =>
            prev.map((c) => ({
              ...c,
              visible: saved.find((s: any) => s.key === c.key)?.visible ?? c.visible,
            }))
          );
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    onChange(state);
    try {
      localStorage.setItem(
        `cols:${storageKey}`,
        JSON.stringify(state.map((c) => ({ key: c.key, visible: c.visible })))
      );
    } catch {}
  }, [state, storageKey, onChange]);

  const toggle = (key: string) =>
    setState((s) => s.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));

  return (
    <div className="relative inline-block">
      <button
        className="bg-white/10 border border-white/10 rounded px-3 py-2"
        aria-label="Spaltenauswahl"
        onClick={() => setOpen((v) => !v)}
      >
        Spalten
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-black/90 border border-white/10 rounded p-2 z-20">
          {state.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-sm py-1">
              <input type="checkbox" checked={c.visible !== false} onChange={() => toggle(c.key)} />
              <span>{c.label}</span>
            </label>
          ))}
          <div className="mt-2 text-right">
            <button
              className="text-xs bg-white/10 px-2 py-1 rounded"
              onClick={() => setOpen(false)}
            >
              Schließen (ESC)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
