import React from 'react';
import { cn } from '../utils/cn';

export interface FilterOption {
	id: string;
	label: string;
	count?: number;
}

export interface FilterGroup {
	id: string;
	title: string;
	options: FilterOption[];
	multiple?: boolean;
}

interface FilterPanelProps {
	groups: FilterGroup[];
	selectedFilters: Record<string, string[]>;
	onFilterChange: (groupId: string, optionId: string, checked: boolean) => void;
	onReset?: () => void;
	className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
	groups,
	selectedFilters,
	onFilterChange,
	onReset,
	className,
}) => {
	const hasActiveFilters = Object.values(selectedFilters).some((filters) => filters.length > 0);

	return (
		<div className={cn('bg-white rounded-lg shadow p-4', className)}>
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold">Filter</h3>
				{hasActiveFilters && onReset && (
					<button onClick={onReset} className="text-sm text-blue-600 hover:text-blue-700">
						Zurücksetzen
					</button>
				)}
			</div>

			<div className="space-y-4">
				{groups.map((group) => (
					<div key={group.id}>
						<h4 className="font-medium text-gray-700 mb-2">{group.title}</h4>
						<div className="space-y-1">
							{group.options.map((option) => {
								const isChecked = selectedFilters[group.id]?.includes(option.id) || false;

								return (
									<label key={option.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
										<input
											type={group.multiple ? 'checkbox' : 'radio'}
											name={group.multiple ? undefined : group.id}
											checked={isChecked}
											onChange={(e) => onFilterChange(group.id, option.id, e.target.checked)}
											className="text-blue-600 focus:ring-blue-500"
										/>
										<span className="text-sm text-gray-700">{option.label}</span>
										{option.count !== undefined && <span className="text-xs text-gray-500">({option.count})</span>}
									</label>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
