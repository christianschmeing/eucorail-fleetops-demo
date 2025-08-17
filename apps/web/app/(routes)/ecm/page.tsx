export default function ECMHubPage() {
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-4">ECM Hub</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-black/30 border border-white/10 rounded-xl p-4">
          <h2 className="font-semibold mb-2">ECM‑1 Governance</h2>
          <p className="text-white/60">Policy‑Registry, Compliance‑Checks, Audit‑Trail.</p>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-4">
          <h2 className="font-semibold mb-2">ECM‑2 Development</h2>
          <p className="text-white/60">Maßnahmenkatalog, FME(C)A/RCM, Review → Freigabe.</p>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-4">
          <h2 className="font-semibold mb-2">ECM‑3 Fleet Maintenance</h2>
          <p className="text-white/60">Kapazitätsplan, WO‑Planner, Teileverfügbarkeit.</p>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-4">
          <h2 className="font-semibold mb-2">ECM‑4 Delivery</h2>
          <p className="text-white/60">Auftragsausführung, Rückmeldung, QS.</p>
        </div>
      </div>
    </div>
  );
}


