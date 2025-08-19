'use client';

import { useState } from 'react';
import { FilterPanel } from '@eucorail/ui';
import type { FilterGroup } from '@eucorail/ui';

interface MapFiltersProps {
	onFiltersChange?: (filters: Record<string, string[]>) => void;
	currentFilters?: Record<string, string[]>;
}

const filterGroups: FilterGroup[] = [
	{
		id: 'state',
		title: 'Bundesland',
		options: [
			{ id: 'by', label: 'Bayern', count: 5 },
			{ id: 'bw', label: 'Baden-Württemberg', count: 8 },
		],
		multiple: true,
	},
	{
		id: 'line',
		title: 'Linie',
		options: [
			{ id: 're9', label: 'RE9', count: 4 },
			{ id: 'mex16', label: 'MEX16', count: 4 },
			{ id: 're8', label: 'RE8', count: 5 },
		],
		multiple: true,
	},
	{
		id: 'status',
		title: 'Status',
		options: [
			{ id: 'active', label: 'Aktiv', count: 10 },
			{ id: 'maintenance', label: 'Wartung', count: 2 },
			{ id: 'alert', label: 'Alarm', count: 1 },
		],
		multiple: true,
	},
];

export const MapFilters: React.FC<MapFiltersProps> = ({ onFiltersChange, currentFilters }) => {
	const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(
		currentFilters || { state: [], line: [], status: [] }
	);

	const handleFilterChange = (groupId: string, optionId: string, checked: boolean) => {
		const next = { ...selectedFilters };
		const current = next[groupId] || [];
		next[groupId] = checked ? [...current, optionId] : current.filter((id) => id !== optionId);
		setSelectedFilters(next);
		onFiltersChange?.(next);
	};

	const handleReset = () => {
		const reset = { state: [], line: [], status: [] } as Record<string, string[]>;
		setSelectedFilters(reset);
		onFiltersChange?.(reset);
	};

	return (
		<FilterPanel
			groups={filterGroups}
			selectedFilters={selectedFilters}
			onFilterChange={handleFilterChange}
			onReset={handleReset}
		/>
	);
};
