# Eucorail FleetOps Demo (BY/BW)

<p>
  <a href="https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/gh-pages/state/badge.json">
    <img alt="state" src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/gh-pages/state/badge.json" />
  </a>
</p>

<sub>Badge zeigt bei <code>main</code> explizit <code>main@…</code>, auf Feature-Branches <code>&lt;branch&gt;@…</code>.</sub>

Ein professionelles Web-Mockup einer Flottenplattform für Zugwartung und Asset-Management mit simulierten Positions- und Zustandsdaten entlang realer Linien in Bayern (BY) und Baden-Württemberg (BW).

## 🎯 Projektziel

- **Map-first UI** mit klaren KPIs und dezenter Branding-Optik
- **Simulierte Daten** entlang realer Linien (RE9, MEX16, RE8)
- **Responsive Design** mit A11y AA Standards
- **Demo-tauglich** mit Suche, Filtern und Detail-Ansichten

## 🚀 Quick Start

### Voraussetzungen

- Node.js 20.17.0 oder höher
- npm 9.0.0 oder höher

### Installation

```bash
# Repository klonen
git clone <your-github-repo-url>
cd Geolocation-Mockup

# Dependencies installieren
npm install

# Demo starten
npm run demo
```

Die Demo ist dann verfügbar unter:
- **Web**: http://localhost:3001
- **API**: http://localhost:4100

### Alternative Befehle

```bash
# Nur Entwicklungsserver
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

## 🧪 Testing

```bash
# Visueller Test mit Puppeteer
node test-simple.js

# Robuster Test mit automatischer Prozessverwaltung
node test-robust-v2.js
```

## 🤖 AI Entry Points

- State JSON: https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/gh-pages/state/project-state.json
- (main) State JSON Hinweis: Badge zeigt `main@…`, sobald der State von `main` stammt.
- Badge Endpoint: https://raw.githubusercontent.com/ChristianSchmeing/eucorail-fleetops-demo/gh-pages/state/badge.json
- Bedeutung: JSON enthält Commit/Branch, CI-Status, geänderte Bereiche (`apps_web`, `packages_api`, `scripts`, `docs`), offene P0/P1/PRs, optional `data_version`, sowie Zeitstempel. Siehe `docs/AI_README.md`.

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
