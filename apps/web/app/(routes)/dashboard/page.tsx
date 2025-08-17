export default function DashboardPage() {
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-black/30 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-white/60">Flottenverfügbarkeit</div>
          <div className="text-3xl font-semibold mt-2">97.2%</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-white/60">Overdue-Quote</div>
          <div className="text-3xl font-semibold mt-2">3.1%</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-white/60">Ø Verspätung</div>
          <div className="text-3xl font-semibold mt-2">+2.8 min</div>
        </div>
      </div>
    </div>
  );
}


