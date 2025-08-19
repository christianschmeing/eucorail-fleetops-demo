import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function WorkshopView({ depot }: { depot: { name: string } }) {
	return (
		<div className="p-6 bg-gray-100 min-h-screen">
			<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold">{depot.name}</h2>
						<p className="text-gray-600">Workshop Management System</p>
					</div>
					<div className="flex gap-4">
						<StatusIndicator label="Bay Utilization" value={75} unit="%" />
						<StatusIndicator label="Technicians" value={12} unit="staff" />
						<StatusIndicator label="Active WO" value={8} unit="orders" />
					</div>
				</div>
			</div>

			<div className="grid grid-cols-12 gap-6">
				<div className="col-span-8">
					<Card>
						<CardBody>
							<CardTitle>Service Bays Status</CardTitle>
							<div className="grid grid-cols-4 gap-4">
								{Array.from({ length: 8 }, (_, i) => (
									<ServiceBay
										key={i}
										bayNumber={i + 1}
										occupied={i < 6}
										vehicle={i < 6 ? `66${String(i + 10).padStart(3, '0')}` : null}
										workType={['IS2', 'IS1', 'Repair', 'IS3', 'Cleaning', 'IS2'][i] || null}
										progress={[45, 80, 20, 95, 100, 60][i] || 0}
										technician={['Schmidt', 'Mueller', 'Weber', 'Fischer', 'Wagner', 'Becker'][i]}
									/>
								))}
							</div>
							<div className="mt-6 p-4 bg-gray-50 rounded-lg">
								<h4 className="font-semibold mb-3">Inspection Pit Status</h4>
								<div className="grid grid-cols-2 gap-4">
									<InspectionPit pitNumber={1} vehicle="78045" inspection="Undercarriage" progress={65} />
									<InspectionPit pitNumber={2} vehicle="66033" inspection="Bogie Service" progress={30} />
								</div>
							</div>
						</CardBody>
					</Card>
				</div>
				<div className="col-span-4">
					<Card>
						<CardBody>
							<CardTitle>Today's Work Orders</CardTitle>
							<WorkOrderQueue />
						</CardBody>
					</Card>
				</div>
			</div>
		</div>
	);
}

function StatusIndicator({ label, value, unit }: { label: string; value: number; unit?: string }) {
	return (
		<div className="text-right">
			<div className="text-xs text-gray-500">{label}</div>
			<div className="text-lg font-semibold">{value}{unit ? ` ${unit}` : ''}</div>
		</div>
	);
}

function ServiceBay({ bayNumber, occupied, vehicle, workType, progress, technician }: { bayNumber: number; occupied: boolean; vehicle: string | null; workType: string | null; progress: number; technician: string }) {
	return (
		<div className={`p-4 rounded-lg border-2 ${occupied ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
			<div className="flex justify-between items-start mb-2">
				<span className="text-lg font-bold">Bay {bayNumber}</span>
				{occupied && <Badge>{workType}</Badge>}
			</div>
			{occupied ? (
				<div className="space-y-2">
					<div className="text-sm font-semibold">{vehicle}</div>
					<div className="w-full bg-white rounded h-2 overflow-hidden">
						<div className="bg-blue-500 h-2" style={{ width: `${progress}%` }} />
					</div>
					<div className="text-xs text-gray-600">Tech: {technician}</div>
					<div className="text-xs font-medium">{progress === 100 ? 'Complete' : `${Math.floor((100 - progress) * 0.6)} min remaining`}</div>
				</div>
			) : (
				<div className="text-center py-4 text-gray-400">
					<span className="text-xs">Available</span>
				</div>
			)}
		</div>
	);
}

function InspectionPit({ pitNumber, vehicle, inspection, progress }: { pitNumber: number; vehicle: string; inspection: string; progress: number }) {
	return (
		<div className="p-3 rounded-lg border bg-white">
			<div className="flex items-center justify-between">
				<div className="font-semibold">Pit {pitNumber} • {inspection}</div>
				<Badge>{vehicle}</Badge>
			</div>
			<div className="w-full bg-gray-100 rounded h-2 overflow-hidden mt-2">
				<div className="bg-emerald-500 h-2" style={{ width: `${progress}%` }} />
			</div>
		</div>
	);
}

function WorkOrderQueue() {
	const orders = Array.from({ length: 6 }).map((_, i) => ({ id: `WO-${1000 + i}`, title: ['IS2 – 66014', 'Repair – 78023', 'IS1 – 66022', 'Cleaning – 66041', 'IS3 – 79012', 'Inspection – 66055'][i] }));
	return (
		<div className="space-y-2">
			{orders.map((o) => (
				<div key={o.id} className="p-3 bg-white rounded border flex items-center justify-between">
					<div>
						<div className="font-medium">{o.title}</div>
						<div className="text-xs text-gray-500">{o.id}</div>
					</div>
					<button className="text-xs px-2 py-1 rounded bg-gray-900 text-white">Open</button>
				</div>
			))}
		</div>
	);
}
