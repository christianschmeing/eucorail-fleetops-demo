import React from 'react';
import type { Allocation } from '../depot-data';

interface Props {
  filter: {
    status: 'all' | Allocation['status'];
    isLevel: 'all' | Allocation['purpose'];
    line: 'all' | string;
    feature: 'all' | string;
  };
  allocations: Allocation[];
  onFilterChange: (f: Props['filter']) => void;
}

export default function DepotMapFilters({ filter, allocations, onFilterChange }: Props) {
  const lines = Array.from(new Set(allocations.map((a) => a.line_code))).sort();
  const onSel = (key: keyof Props['filter']) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    onFilterChange({ ...filter, [key]: e.target.value as any });
  return (
    <div className="p-3 border-b border-gray-700 space-y-2" data-testid="sidebar">
      <div className="text-sm text-gray-300 font-semibold">Filter</div>
      <div className="grid grid-cols-1 gap-2">
        <label className="text-xs text-gray-400">Status</label>
        <select
          value={filter.status}
          onChange={onSel('status')}
          className="bg-gray-900 text-gray-200 p-2 rounded border border-gray-700"
        >
          <option value="all">Alle</option>
          <option value="active">Aktiv</option>
          <option value="maintenance">Wartung</option>
          <option value="reserve">Reserve</option>
          <option value="abstellung">Abstellung</option>
          <option value="alarm">Alarm</option>
          <option value="offline">Offline</option>
        </select>

        <label className="text-xs text-gray-400">IS‑Stufe</label>
        <select
          value={filter.isLevel}
          onChange={onSel('isLevel')}
          className="bg-gray-900 text-gray-200 p-2 rounded border border-gray-700"
        >
          <option value="all">Alle</option>
          <option value="IS1">IS1</option>
          <option value="IS2">IS2</option>
          <option value="IS3">IS3</option>
          <option value="IS4">IS4</option>
          <option value="ARA">ARA</option>
          <option value="Korr">Korr</option>
          <option value="Unfall">Unfall</option>
        </select>

        <label className="text-xs text-gray-400">Linie</label>
        <select
          value={filter.line}
          onChange={onSel('line')}
          className="bg-gray-900 text-gray-200 p-2 rounded border border-gray-700"
        >
          <option value="all">Alle</option>
          {lines.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
