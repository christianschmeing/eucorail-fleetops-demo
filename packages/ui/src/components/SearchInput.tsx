import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../utils/cn';

export interface SearchResult {
	id: string;
	label: string;
	description?: string;
	type?: string;
}

interface SearchInputProps {
	placeholder?: string;
	onSearch: (query: string) => void;
	onSelect?: (result: SearchResult) => void;
	suggestions?: SearchResult[];
	loading?: boolean;
	className?: string;
	debounceMs?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
	placeholder = 'Suche...',
	onSearch,
	onSelect,
	suggestions = [],
	loading = false,
	className,
	debounceMs = 300,
}) => {
	const [query, setQuery] = useState('');
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		if (query.length > 0) {
			timeoutRef.current = setTimeout(() => {
				onSearch(query);
				setShowSuggestions(true);
			}, debounceMs);
		} else {
			setShowSuggestions(false);
		}

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [query, onSearch, debounceMs]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!showSuggestions) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedIndex >= 0 && suggestions[selectedIndex]) {
					handleSelect(suggestions[selectedIndex]);
				}
				break;
			case 'Escape':
				setShowSuggestions(false);
				setSelectedIndex(-1);
				break;
		}
	};

	const handleSelect = (result: SearchResult) => {
		setQuery(result.label);
		setShowSuggestions(false);
		setSelectedIndex(-1);
		onSelect?.(result);
	};

	return (
		<div className={cn('relative', className)}>
			<div className="relative">
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => query.length > 0 && setShowSuggestions(true)}
					onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
					placeholder={placeholder}
					className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				<div className="absolute inset-y-0 right-0 flex items-center pr-3">
					{loading ? (
						<div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full" />
					) : (
						<svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					)}
				</div>
			</div>

			{showSuggestions && suggestions.length > 0 && (
				<div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
					{suggestions.map((suggestion, index) => (
						<div
							key={suggestion.id}
							onClick={() => handleSelect(suggestion)}
							className={cn('px-4 py-2 cursor-pointer hover:bg-gray-50', selectedIndex === index && 'bg-gray-100')}
						>
							<div className="font-medium">{suggestion.label}</div>
							{suggestion.description && <div className="text-sm text-gray-600">{suggestion.description}</div>}
							{suggestion.type && (
								<span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">{suggestion.type}</span>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};
