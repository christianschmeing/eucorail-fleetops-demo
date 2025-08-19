'use client';

import { useState, useCallback, useRef } from 'react';
import { SearchInput } from '@eucorail/ui';
import type { SearchResult } from '@eucorail/ui';

interface TrainSearchProps {
  onSelect?: (result: SearchResult) => void;
}

const mockTrains: SearchResult[] = [
	{ id: '78001', label: 'RE9 78001', description: 'Ulm → Augsburg', type: 'RE9' },
	{ id: '78002', label: 'RE9 78002', description: 'Augsburg → Ulm', type: 'RE9' },
	{ id: '66011', label: 'MEX16 66011', description: 'München → Ulm', type: 'MEX16' },
	{ id: '66012', label: 'MEX16 66012', description: 'Ulm → München', type: 'MEX16' },
	{ id: '79021', label: 'RE8 79021', description: 'Stuttgart → München', type: 'RE8' },
	{ id: '79022', label: 'RE8 79022', description: 'Ulm → München', type: 'RE8' },
];

export const TrainSearch: React.FC<TrainSearchProps> = ({ onSelect }) => {
	const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedTrain, setSelectedTrain] = useState<SearchResult | null>(null);
  const cacheRef = useRef<SearchResult[] | null>(null);

	const handleSearch = useCallback(async (query: string) => {
		const q = query.trim().toLowerCase();
		setLoading(true);
		try {
			if (!cacheRef.current) {
				// try relative API (Vercel same-origin). Fallback to mock on error
				let arr: any[] | null = null;
				try {
					const r = await fetch('/api/trains', { cache: 'no-store' });
					if (r.ok) arr = await r.json();
				} catch {}
				const results: SearchResult[] = Array.isArray(arr)
					? arr.map((t: any) => {
						const rawId: string = String(t.id || '');
						const digits = (rawId.match(/\d+/g) || []).join('') || rawId;
						const line = String(t.lineId || t.line || '').toUpperCase();
						return {
							id: digits,
							label: `${line ? line + ' ' : ''}${digits}`.trim(),
							description: String(t.route || t.name || '') || rawId,
							type: line || 'TRAIN',
						};
					})
					: mockTrains;
				cacheRef.current = results;
			}
			const base = cacheRef.current || mockTrains;
			const filtered = q
				? base.filter((item) =>
						item.label.toLowerCase().includes(q) || item.id.includes(query) || String(item.type).toLowerCase().includes(q)
				  )
				: base.slice(0, 8);
			setSuggestions(filtered);
		} finally {
			setLoading(false);
		}
	}, []);

	const handleSelect = useCallback((result: SearchResult) => {
		setSelectedTrain(result);
		onSelect?.(result);
	}, [onSelect]);

	return (
		<div className="w-full max-w-md">
			<SearchInput
				placeholder="Zugnummer eingeben..."
				onSearch={handleSearch}
				onSelect={handleSelect}
				suggestions={suggestions}
				loading={loading}
			/>
			{selectedTrain && (
				<div className="mt-4 p-4 bg-blue-50 rounded-lg">
					<p className="text-sm text-blue-700">
						Ausgewählt: <strong>{selectedTrain.label}</strong>
					</p>
					<p className="text-xs text-blue-600 mt-1">{selectedTrain.description}</p>
				</div>
			)}
		</div>
	);
};
