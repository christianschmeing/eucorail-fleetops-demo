# Eucorail FleetOps Demo - Projekt Struktur

## Verzeichnisstruktur

```
eucorail-fleetops-demo/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD Pipeline
├── .husky/
│   ├── pre-commit             # Linting vor Commit
│   └── commit-msg             # Commit Message Validierung
├── apps/
│   └── web/                   # Next.js Frontend
│       ├── app/               # App Router Pages
│       │   ├── (routes)/      # Route Groups
│       │   ├── test-ui/       # UI Component Test Page
│       │   └── page.tsx       # Homepage
│       ├── components/        # Legacy React Components
│       ├── features/          # Feature-basierte Module
│       │   └── map/           # Karten-Features
│       ├── lib/               # Utilities & Helpers
│       └── styles/            # Global Styles
├── packages/
│   ├── api/                   # Fastify Backend
│   │   ├── src/               # Source Code
│   │   ├── seeds/             # Daten-Generierung
│   │   └── data/              # JSON Daten
│   └── ui/                    # Shared UI Library
│       ├── src/
│       │   ├── components/    # Reusable Components
│       │   ├── utils/         # UI Utilities
│       │   └── styles/        # Shared Styles
│       └── tailwind.config.ts
├── scripts/                    # Utility Scripts
├── test-runner.js             # Test Infrastruktur
├── run-tests.js               # Test Orchestrierung
├── .cursorrules               # Cursor AI Rules
├── .eslintrc.json             # ESLint Config
├── .prettierrc                # Prettier Config
├── package.json               # Root Dependencies
└── README.md                  # Projekt Dokumentation
```

## Bereinigte Komponenten

### UI Library (@eucorail/ui)
- LoadingSpinner
- ErrorBoundary
- EmptyState
- Toast

### Legacy Components (apps/web/components)
- MapShell
- ModernHeader
- ModernSidebar
- TrainMarkers
- (werden schrittweise zu @eucorail/ui migriert)
