'use client';

import { useMemo, useState } from 'react';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface SLAMetric {
	name: string;
	current: number;
	target: number;
	unit: string;
	trend: number;
	status: 'good' | 'warning' | 'critical';
	penalty?: number;
	history: Array<{ date: string; value: number }>;
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
	const path = useMemo(() => {
		if (points.length === 0) return '';
		const width = 100;
		const height = 30;
		const max = Math.max(...points);
		const min = Math.min(...points);
		const norm = (v: number) => (max === min ? height / 2 : height - ((v - min) / (max - min)) * height);
		return points
			.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * width} ${norm(v)}`)
			.join(' ');
	}, [points]);
	return (
		<svg width={100} height={30} viewBox="0 0 100 30">
			<path d={path} fill="none" stroke={color} strokeWidth={2} />
		</svg>
	);
}

export function SLADashboard() {
	const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

	const slaMetrics: SLAMetric[] = [
		{
			name: 'Fleet Availability',
			current: 94.7,
			target: 95.5,
			unit: '%',
			trend: -0.8,
			status: 'warning',
			penalty: 12500,
			history: [
				{ date: '01/01', value: 96.2 },
				{ date: '01/08', value: 95.8 },
				{ date: '01/15', value: 94.7 },
			],
		},
		{
			name: 'MTBF',
			current: 14825,
			target: 15000,
			unit: 'km',
			trend: -175,
			status: 'warning',
			penalty: 8000,
			history: [
				{ date: '01/01', value: 15200 },
				{ date: '01/08', value: 15000 },
				{ date: '01/15', value: 14825 },
			],
		},
		{
			name: 'MTTR',
			current: 4.2,
			target: 4.5,
			unit: 'hours',
			trend: -0.3,
			status: 'good',
			history: [
				{ date: '01/01', value: 4.5 },
				{ date: '01/08', value: 4.3 },
				{ date: '01/15', value: 4.2 },
			],
		},
		{
			name: 'First Time Fix',
			current: 91.3,
			target: 92.0,
			unit: '%',
			trend: -0.7,
			status: 'critical',
			penalty: 5000,
			history: [
				{ date: '01/01', value: 92.5 },
				{ date: '01/08', value: 92.0 },
				{ date: '01/15', value: 91.3 },
			],
		},
	];

	const totalPenalties = slaMetrics.filter((m) => m.status !== 'good' && m.penalty).reduce((sum, m) => sum + (m.penalty || 0), 0);

	const contractDetails = {
		customer: 'Arverio Baden-Württemberg',
		contract: 'MA-2024-BW-001',
		startDate: '2024-01-01',
		endDate: '2032-12-31',
		vehicles: 66,
		monthlyValue: 485000,
		penaltyCap: 50000,
	};

	return (
		<div className="space-y-6">
			<Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
				<CardBody>
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-lg font-semibold">{contractDetails.customer}</h3>
							<p className="text-sm text-gray-600">Contract: {contractDetails.contract}</p>
							<p className="text-sm text-gray-600">Fleet Size: {contractDetails.vehicles} vehicles</p>
						</div>
						<div className="text-right">
							<p className="text-sm text-gray-600">Monthly Value</p>
							<p className="text-2xl font-bold">€{contractDetails.monthlyValue.toLocaleString()}</p>
							<p className="text-sm text-gray-600">Valid until {new Date(contractDetails.endDate).toLocaleDateString()}</p>
						</div>
					</div>
				</CardBody>
			</Card>

			{totalPenalties > 0 && (
				<Alert className="border-red-200 bg-red-50">
					<DollarSign className="h-4 w-4 text-red-600" />
					<AlertDescription className="text-red-900">
						<div className="flex items-center justify-between">
							<span className="font-semibold">Current Month Penalty Risk: €{totalPenalties.toLocaleString()}</span>
							<span className="text-sm">Cap: €{contractDetails.penaltyCap.toLocaleString()}</span>
						</div>
						<Progress value={(totalPenalties / contractDetails.penaltyCap) * 100} className="mt-2" />
					</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-4 gap-4">
				{slaMetrics.map((metric) => (
					<Card key={metric.name} className={`border-t-4 ${metric.status === 'good' ? 'border-t-green-500' : metric.status === 'warning' ? 'border-t-yellow-500' : 'border-t-red-500'}`}>
						<CardBody className="space-y-3">
							<CardTitle className="text-sm font-medium flex items-center justify-between">
								<span>{metric.name}</span>
								<Badge variant={metric.status === 'good' ? 'ok' : metric.status === 'warning' ? 'warn' : 'danger'}>{metric.status}</Badge>
							</CardTitle>
							<div>
								<div className="flex items-baseline justify-between">
									<span className="text-2xl font-bold">{metric.current.toLocaleString()}</span>
									<span className="text-sm text-gray-600">{metric.unit}</span>
								</div>
								<div className="flex items-center gap-2 mt-1">
									{metric.trend > 0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
									<span className={`text-xs font-medium ${metric.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>{metric.trend > 0 ? '+' : ''}{metric.trend} {metric.unit}</span>
								</div>
							</div>
							<div>
								<div className="flex justify-between text-xs mb-1">
									<span className="text-gray-600">Target: {metric.target}</span>
									<span className={`${metric.status === 'good' ? 'text-green-600' : metric.status === 'warning' ? 'text-yellow-600' : 'text-red-600'} font-medium`}>{((metric.current / metric.target) * 100).toFixed(1)}%</span>
								</div>
								<Progress value={(metric.current / metric.target) * 100} className="h-1.5" />
							</div>
							<div className="h-12 flex items-center justify-center">
								<Sparkline points={metric.history.map((h) => h.value)} color={metric.status === 'good' ? '#10b981' : metric.status === 'warning' ? '#f59e0b' : '#ef4444'} />
							</div>
							{metric.penalty && metric.status !== 'good' && (
								<div className="pt-2 border-t flex items-center justify-between text-xs">
									<span className="text-red-600 font-medium">Penalty</span>
									<span className="font-bold text-red-600">€{metric.penalty.toLocaleString()}/mo</span>
								</div>
							)}
						</CardBody>
					</Card>
				))}
			</div>

			<Card>
				<CardBody>
					<div className="flex items-center justify-between">
						<CardTitle>SLA Performance Trend</CardTitle>
						<div className="flex gap-2">
							{(['week', 'month', 'quarter', 'year'] as const).map((p) => (
								<button key={p} onClick={() => setSelectedPeriod(p)} className={`px-3 py-1 text-sm rounded ${selectedPeriod === p ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
							))}
						</div>
					</div>
					<div className="mt-4 text-sm text-gray-600">Period: {selectedPeriod}</div>
				</CardBody>
			</Card>
		</div>
	);
}
