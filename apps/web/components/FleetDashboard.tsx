import React from 'react';

function KPICard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
	return (
		<div className="rounded-xl bg-white shadow p-3">
			<div className="text-xs text-gray-500">{title}</div>
			<div className="text-xl font-semibold">{value}</div>
			{subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
		</div>
	);
}

function RegionCard({ region, vehicles, operational, maintenance }: { region: string; vehicles: number; operational: number; maintenance: number }) {
	return (
		<div className="flex-1 rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 text-white p-3">
			<div className="text-xs text-white/70">{region}</div>
			<div className="text-lg font-semibold">{vehicles} Fahrzeuge</div>
			<div className="text-xs text-white/80 mt-1">{operational} aktiv • {maintenance} Wartung</div>
		</div>
	);
}

export default function FleetDashboard() {
	return (
		<div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl p-4 w-96">
			<div className="flex items-center mb-4">
				<div className="w-2 h-8 bg-orange-500 mr-3" />
				<h1 className="text-xl font-bold">Eucorail FleetOps</h1>
			</div>
			<div className="grid grid-cols-3 gap-3 mb-4">
				<KPICard title="Flottengröße" value="144" subtitle="Fahrzeuge" />
				<KPICard title="Verfügbarkeit" value="94,7%" subtitle="Ziel 95,5%" />
				<KPICard title="Aktiv" value="122" subtitle="~85%" />
			</div>
			<div className="flex gap-3 mb-3">
				<RegionCard region="Baden-Württemberg" vehicles={66} operational={58} maintenance={8} />
				<RegionCard region="Bayern" vehicles={78} operational={68} maintenance={10} />
			</div>
			<div className="text-xs text-gray-600">Hinweis: Demodaten – Werte können mit Live‑Backend verbunden werden</div>
		</div>
	);
}
