'use client';
import { useEffect, useState } from 'react';

type Toast = { id: number; type: 'info' | 'warn' | 'error'; message: string };

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    let idSeq = 1;
    const onToast = (e: any) => {
      const detail = (e?.detail || {}) as Partial<Toast>;
      const id = idSeq++;
      const t: Toast = {
        id,
        type: (detail.type as any) || 'info',
        message: String(detail.message || ''),
      };
      setToasts((arr) => [...arr, t]);
      setTimeout(() => setToasts((arr) => arr.filter((x) => x.id !== id)), 4000);
    };
    window.addEventListener('toast', onToast as any);
    return () => window.removeEventListener('toast', onToast as any);
  }, []);

  const color = (type: Toast['type']) =>
    type === 'error'
      ? 'bg-red-500/20 border-red-500/30 text-red-200'
      : type === 'warn'
        ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200'
        : 'bg-white/10 border-white/20';

  return (
    <div className="fixed top-4 right-4 z-[5000] space-y-2" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className={`px-3 py-2 rounded border text-sm shadow ${color(t.type)}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
