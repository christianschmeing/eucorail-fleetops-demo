import { ReactNode } from 'react';
import { clsx } from 'clsx';

export type TabKey = string;

export function Tabs({
  tabs,
  active,
  onChange
}: { tabs: Array<{ key: TabKey; label: ReactNode }>; active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="flex gap-2" role="tablist">
      {tabs.map(t => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active===t.key}
          onClick={() => onChange(t.key)}
          className={clsx('px-3 py-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-euco-accent', active===t.key ? 'bg-euco-accent text-black' : 'bg-black/30')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}


