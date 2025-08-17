'use client';
import { useMemo } from 'react';
import { useVirtualWindow } from './useVirtualWindow';

type Column<T> = { key: keyof T | string; label: string; width?: number; render?: (row: T) => any };

export function TableView<T>({ rows, columns, rowHeight = 40 }: { rows: T[]; columns: Column<T>[]; rowHeight?: number }) {
  const { containerRef, start, end, offset, totalHeight } = useVirtualWindow(rows.length, rowHeight);
  const slice = useMemo(() => rows.slice(start, end), [rows, start, end]);
  return (
    <div ref={containerRef} className="h-[calc(100vh-180px)] overflow-auto border border-white/10 rounded">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-black/60 backdrop-blur-sm">
          <tr>
            {columns.map((c) => (
              <th key={String(c.key)} className="text-left px-3 py-2 border-b border-white/10" style={{ width: c.width }}>{c.label}</th>
            ))}
          </tr>
        </thead>
      </table>
      <div style={{ height: totalHeight }}>
        <div style={{ transform: `translateY(${offset}px)` }}>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {slice.map((row: any, i) => (
                <tr key={i} className="odd:bg-white/5">
                  {columns.map((c) => (
                    <td key={String(c.key)} className="px-3 py-2 border-b border-white/5">
                      {c.render ? c.render(row) : String(row[c.key as keyof typeof row] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


