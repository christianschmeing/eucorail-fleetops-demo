# Eucorail FleetOps Demo (BY/BW)

<p>
  <a href="https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/gh-pages/state/badge.json">
    <img alt="state" src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/gh-pages/state/badge.json" />
  </a>
</p>

<sub>Badge zeigt bei <code>main</code> explizit <code>main@…</code>, auf Feature-Branches <code>&lt;branch&gt;@…</code>.</sub>

Ein professionelles Web-Mockup einer Flottenplattform für Zugwartung und Asset-Management mit simulierten Positions- und Zustandsdaten entlang realer Linien in Bayern (BY) und Baden-Württemberg (BW).

## 🧭 Agent Operating Manual

- Agent System Rules: docs/AGENT_SYSTEM_RULES.md
- Copy this seed (for new Cursor tab): .agent/SEED.prompt
- Hinweis: Start ausschließlich via Supervisor; kein integriertes Terminal.

## 🎯 Projektziel

- **Map-first UI** mit klaren KPIs und dezenter Branding-Optik
- **Simulierte Daten** entlang realer Linien (RE9, MEX16, RE8)
- **Responsive Design** mit A11y AA Standards
- **Demo-tauglich** mit Suche, Filtern und Detail-Ansichten

## 🚀 Quick Start (Supervisor auf Port 3002)

### Voraussetzungen

- Node.js 20.17.0 oder höher
- npm 9.0.0 oder höher

### Installation & Start

```bash
# Repository klonen
git clone <your-github-repo-url>
cd Geolocation-Mockup

# Dependencies installieren
npm install

# Supervisor starten (Always‑Fresh Build + Self‑Heal)
npm run dev:stack:zsh
```

Erreichbarkeit:

- **Web**: http://localhost:3002
- **API**: http://localhost:4100

### Alternative Befehle

```bash
# Nur Entwicklungsserver (reiner Dev‑Modus, 3001) – empfohlen ist Supervisor
npm run dev

# Build erstellen
npm run build

# Daten neu generieren
npm run seed:lines
npm run seed:fleet

# Simulation starten
npm run sim:start

# Alle Prozesse stoppen
npm run stop
```

## 🌐 Environment Variablen (lokal/Docker/CI)

- API_BASE: Server-seitige Basis-URL für den Frontend-SSE-Proxy (`apps/web/app/api/events/route.ts`). Default: `http://localhost:4100`.
- NEXT_PUBLIC_API_BASE: Client-seitige Basis-URL für direkte API-Aufrufe im Browser. Default: `http://localhost:4100`.
- NEXT_PUBLIC_TEST_MODE: Wenn `1`, deaktiviert Map-Animationen und rendert Test‑HUD/Ready‑Signale.
- PORT: API-Port (packages/api). Default: `4100`.
- NEXT_PORT: Web-Port (apps/web). Default: `3001`.

Hinweis: Lokale Scripts setzen sinnvolle Defaults. In Docker/CI sollten obige Variablen explizit gesetzt werden.

## 🏗️ Projektstruktur

```
Geolocation-Mockup/
├── apps/
│   └── web/                 # Next.js Frontend
│       ├── app/            # App Router
│       ├── components/     # React Komponenten
│       └── styles/         # CSS/Tailwind
├── packages/
│   └── api/                # Fastify Backend
│       ├── src/           # API Code
│       ├── seeds/         # Daten-Generierung
│       └── data/          # JSON Daten
├── scripts/                # Utility Scripts
└── package.json           # Root Configuration
```

## 🛠️ Tech Stack

### Frontend

- **Next.js 14** (App Router)
- **React 18**
- **MapLibre GL JS** (Karten)
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** (State Management)
- **Zod** (Typen-Sicherheit)

### Backend

- **Fastify** (Node.js)
- **WebSocket/SSE** (Real-time Updates)
- **In-Memory Data** (MVP)

## 📊 Features

### MVP Features

- ✅ Vollbildkarte mit Train-Markern
- ✅ Real-time Positions-Updates (1 Hz)
- ✅ 3 Linien (RE9, MEX16, RE8) mit korrekten Bounds
- ✅ Mindestens 10 simulierte Züge
- ✅ Responsive Design
- ✅ Automatische Prozessverwaltung

### Geplante Features

- 🔄 Suche nach Zugnummer (Autocomplete)
- 🔄 Kartenfilter (BY/BW/Linie)
- 🔄 Detail-Drawer für Züge
- 🔄 Fleet-Health Panel
- 🔄 Line-Shapes und Station-Tooltips

## 🗺️ Linien & Daten

### Simulierte Linien

- **RE9** (BY): Ulm–Augsburg
- **MEX16** (BW): Stuttgart–Ulm
- **RE8** (BW): Stuttgart–Würzburg

### Fleet-Komposition

- **RE9**: Mireo/Desiro HC (4-5 Einheiten)
- **MEX16**: FLIRT 3 (3-4 Einheiten)
- **RE8**: FLIRT 3 (3-4 Einheiten)

### Zugnummern-Schema

- RE9: 78xxx
- MEX16: 66xxx
- RE8: 79xxx

## 🔧 Entwicklung

### Scripts

```bash
# Entwicklung
npm run dev              # Web + API parallel
npm run build           # Production Build

# Daten & Simulation
npm run seed:lines      # Linien-Shapes generieren
npm run seed:fleet      # Fleet-Daten generieren
npm run sim:start       # Simulation starten

# Demo & Testing
npm run demo            # Vollständige Demo
npm run stop            # Alle Prozesse stoppen
```

### API Endpoints

- `GET /api/lines` - Linien-Informationen
- `GET /api/stations?line=...` - Stationen pro Linie
- `GET /api/trains/live?line=...` - Live Train-Positions
- `GET /api/trains/:runId` - Train-Details
- `GET /api/fleet/health` - Fleet-Health Status
- `GET /events` - SSE Stream für Real-time Updates
- `WS /ws` - WebSocket für Real-time Updates

## 🧪 Testing (intern)

```bash
Interne Checks (typecheck/lint/build/test:int) – keine E2E/Playwright im CI.
```

## 🤖 AI Entry Points

- State JSON: https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/gh-pages/state/project-state.json
- (main) State JSON Hinweis: Badge zeigt `main@…`, sobald der State von `main` stammt.
- Badge Endpoint: https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/gh-pages/state/badge.json
- Bedeutung: JSON enthält Commit/Branch, CI-Status, geänderte Bereiche (`apps_web`, `packages_api`, `scripts`, `docs`), offene P0/P1/PRs, optional `data_version`, sowie Zeitstempel. Siehe `docs/AI_README.md`.
- Agent Rules URL (state.agent_rules_url) und Seed URL (state.agent_seed_url) werden im State ergänzt.
- Open latest Preview (auto‑redirect): https://christianschmeing.github.io/eucorail-fleetops-demo/state/
- Hinweis: Falls Basic‑Auth aktiv ist, bitte Zugangsdaten verwenden.

## ✅ CI Preview & Verify

- Starte in GitHub Actions den Workflow „Verify + Perf + Preview“. Der Lauf führt interne Checks (typecheck/lint/build/test:int sofern vorhanden), misst Performance (p50/p95), veröffentlicht optional eine Preview‑URL (Quick‑Tunnel) und aktualisiert `state/project-state.json`.
- Ergebnisse: `CHANGESUMMARY.md` (Verify‑Status, initialJS.gz je Route, p50/p95‑Tabelle, Preview‑URL/Status, Skips), `state/project-state.json`, optional `docs/VC_READINESS.md`.
- Der Workflow läuft zusätzlich bei Push auf `main`/`feat/train-tracker-p0` sowie alle 10 Minuten via Cron; die Preview‑URL steht in `gh-pages/state/project-state.json` unter `preview.web`.
- Stabiler Link: https://christianschmeing.github.io/eucorail-fleetops-demo/state/ (führt auf die aktuelle Preview; zeigt Fallback, falls noch keine Preview).
- Pages Root: https://christianschmeing.github.io/eucorail-fleetops-demo/
- Hinweis: Die konkrete Pages URL wird nach Deploy automatisch in `CHANGESUMMARY.md` geloggt ("Pages URL: …").
- One‑Shot Workflow „Preview + Pages“ erzeugt Preview und veröffentlicht die Pages‑Site in einem Zug.

## 🌍 Public Preview (Stream & PR Preview)

- Stream‑Mode (lokal):
  - Voraussetzungen: `cloudflared` installiert, `CLOUDFLARE_TUNNEL_TOKEN` gesetzt (oder Single‑URL Modus).
  - Start: `npm run dev:stack:zsh -- --stream`
  - Ergebnis: Öffentliche URL wird in `CHANGESUMMARY.md` geloggt; Basic‑Auth optional via `PREVIEW_ENABLE_AUTH=1`, `PREVIEW_BASIC_USER/PASS`.
- PR‑Preview (CI):
  - Web via Vercel, API via Render/Fly (Platzhalter vorhanden). Secrets erforderlich (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).

## 📝 Disclaimer

**Demo-Modus** – Es werden ausschließlich simulierte Positions- und Zustandsdaten gezeigt. Keine Echtzeit- oder Betriebsdaten. Für Präsentationen und Konzeptnachweis bestimmt.

## 🤝 Contributing

1. Fork das Repository
2. Feature Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request erstellen

## 📄 Lizenz

Dieses Projekt ist für interne Eucorail-Demos bestimmt.

## 🆘 Support

Bei Fragen oder Problemen:

1. Issues auf GitHub erstellen
2. Dokumentation prüfen
3. Team kontaktieren

---

**Eucorail FleetOps Demo** - Professionelle Flottenplattform für die Zukunft der Bahnwartung
