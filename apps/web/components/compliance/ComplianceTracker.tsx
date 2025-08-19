'use client';

import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ComplianceItem {
	id: string;
	title: string;
	standard: string;
	status: 'compliant' | 'attention' | 'critical';
	validUntil: string;
	lastAudit: string;
	nextAudit: string;
	completeness: number;
	documents: Array<{
		name: string;
		status: 'valid' | 'expiring' | 'expired' | 'attention';
		date: string;
	}>;
}

export function ComplianceTracker() {
	const complianceItems: ComplianceItem[] = [
		{
			id: 'ecm',
			title: 'ECM Certification',
			standard: 'EU 2019/779',
			status: 'compliant',
			validUntil: '2026-03-15',
			lastAudit: '2024-11-20',
			nextAudit: '2025-05-20',
			completeness: 100,
			documents: [
				{ name: 'ECM Certificate', status: 'valid', date: '2024-03-15' },
				{ name: 'Annual Audit Report', status: 'valid', date: '2024-11-20' },
				{ name: 'Process Documentation', status: 'valid', date: '2024-10-01' },
			],
		},
		{
			id: 'tsi',
			title: 'TSI LOC&PAS',
			standard: 'EU 1302/2014',
			status: 'compliant',
			validUntil: '2025-12-31',
			lastAudit: '2024-10-15',
			nextAudit: '2025-04-15',
			completeness: 95,
			documents: [
				{ name: 'TSI Certificate', status: 'valid', date: '2024-01-15' },
				{ name: 'Noise Level Test', status: 'valid', date: '2024-10-15' },
				{ name: 'Safety Systems Check', status: 'expiring', date: '2024-11-01' },
			],
		},
		{
			id: 'vdv',
			title: 'VDV 154 Quality Standards',
			standard: 'VDV 154/155',
			status: 'attention',
			validUntil: '2025-06-30',
			lastAudit: '2024-08-10',
			nextAudit: '2025-02-10',
			completeness: 78,
			documents: [
				{ name: 'VDV Compliance Report', status: 'expiring', date: '2024-08-10' },
				{ name: 'Staff Certifications', status: 'attention', date: '2024-09-01' },
				{ name: 'Process Manual', status: 'expired', date: '2024-07-01' },
			],
		},
		{
			id: 'iso',
			title: 'ISO 9001:2015',
			standard: 'ISO 9001',
			status: 'compliant',
			validUntil: '2026-09-30',
			lastAudit: '2024-09-15',
			nextAudit: '2025-09-15',
			completeness: 92,
			documents: [
				{ name: 'ISO Certificate', status: 'valid', date: '2023-09-30' },
				{ name: 'Internal Audit', status: 'valid', date: '2024-09-15' },
			],
		},
	];

	const getPillClass = (status: string) => {
		switch (status) {
			case 'compliant':
				return 'bg-green-50 text-green-600 border-green-200';
			case 'attention':
				return 'bg-yellow-50 text-yellow-600 border-yellow-200';
			case 'critical':
				return 'bg-red-50 text-red-600 border-red-200';
			default:
				return 'bg-gray-50 text-gray-600 border-gray-200';
		}
	};

	const criticalItems = complianceItems.filter((i) => i.status !== 'compliant');

	return (
		<div className="space-y-6">
			{criticalItems.length > 0 && (
				<Alert className="border-yellow-200 bg-yellow-50">
					<AlertTriangle className="h-4 w-4 text-yellow-600" />
					<AlertDescription className="text-yellow-900">
						<span className="font-semibold">{criticalItems.length} compliance items require attention</span>
						<ul className="mt-2 space-y-1">
							{criticalItems.map((item) => (
								<li key={item.id} className="text-sm">
									• {item.title}: {item.standard} - Action required by {new Date(item.nextAudit).toLocaleDateString()}
								</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-2 gap-4">
				{complianceItems.map((item) => (
					<Card key={item.id} className={`border-l-4 ${item.status === 'compliant' ? 'border-l-green-500' : item.status === 'attention' ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
						<CardBody className="space-y-4">
							<div className="flex items-start justify-between">
								<div>
									<CardTitle className="text-lg flex items-center gap-2">
										<Shield className="h-4 w-4" />
										{item.title}
									</CardTitle>
									<p className="text-sm text-gray-600 mt-1">{item.standard}</p>
								</div>
								<Badge className={getPillClass(item.status)}>{item.status === 'compliant' ? 'Compliant' : item.status === 'attention' ? 'Attention' : 'Critical'}</Badge>
							</div>

							<div>
								<div className="flex justify-between text-sm mb-1">
									<span className="text-gray-600">Completeness</span>
									<span className="font-semibold">{item.completeness}%</span>
								</div>
								<Progress value={item.completeness} />
							</div>

							<div className="grid grid-cols-2 gap-3 text-sm">
								<div>
									<p className="text-gray-600">Valid Until</p>
									<p className="font-semibold">{new Date(item.validUntil).toLocaleDateString()}</p>
								</div>
								<div>
									<p className="text-gray-600">Next Audit</p>
									<p className="font-semibold">{new Date(item.nextAudit).toLocaleDateString()}</p>
								</div>
							</div>

							<div>
								<p className="text-sm font-semibold mb-2">Documents</p>
								<div className="space-y-1">
									{item.documents.map((doc, idx) => (
										<div key={idx} className="flex items-center justify-between text-xs">
											<span className="flex items-center gap-1">
												{doc.status === 'valid' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : doc.status === 'expiring' ? <Clock className="h-3 w-3 text-yellow-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
												{doc.name}
											</span>
											<span className="text-gray-500">{doc.date}</span>
										</div>
									))}
								</div>
							</div>

							{item.status !== 'compliant' && (
								<div className="pt-2 border-t">
									<button className="text-sm font-semibold text-blue-600 hover:text-blue-700">View Required Actions →</button>
								</div>
							)}
						</CardBody>
					</Card>
				))}
			</div>
		</div>
	);
}
