import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(#ffffff0a_1px,transparent_1px),linear-gradient(90deg,#ffffff0a_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="relative z-10 px-6 py-24 mx-auto max-w-7xl">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl">
                <img src="/logos/eucorail.svg" alt="Eucorail" className="h-16" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              FleetOps Instandhaltungsplattform
              <span className="block text-3xl md:text-4xl mt-2 text-blue-400">Intelligence Platform</span>
            </h1>
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Echtzeit‑Flottenüberwachung, ECM‑konforme Workflows (ECM‑1 bis ECM‑4) und vorausschauende Instandhaltung für 144 Fahrzeuge in Baden‑Württemberg und Bayern.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/maintenance" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xl transform hover:scale-105 transition-all duration-200">Open Maintenance Center</Link>
              <Link href="/map" className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white font-semibold rounded-lg shadow-xl transform hover:scale-105 transition-all duration-200">View Live Fleet Map</Link>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-6 mt-24">
            <MetricCard title="Flottengröße" value="144" subtitle="Fahrzeuge" icon="🚆" />
            <MetricCard title="Verfügbarkeit" value="94,7%" subtitle="SLA: 95,5%" icon="✅" />
            <MetricCard title="MTBF" value="14.8k" subtitle="km" icon="📊" />
            <MetricCard title="ECM‑Konformität (Demo)" value="100%" subtitle="Workflows" icon="🛡️" />
          </div>
          <div className="grid grid-cols-3 gap-8 mt-16">
            <FeatureCard title="Vorausschauende Instandhaltung" description="Vorhersagegestützte Instandhaltung (Demo‑Daten)" icon="🤖" />
            <FeatureCard title="Real-time Monitoring" description="Track 144 vehicles with component-level telemetry" icon="📡" />
            <FeatureCard title="Compliance Automation" description="ECM, TSI und VDV Standards werden automatisch nachverfolgt" icon="📋" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{subtitle}</div>
      <div className="text-xs text-gray-500 mt-1">{title}</div>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-200">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
