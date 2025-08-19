# PROJECT AUDIT – Eucorail FleetOps Demo

Stand: automatisch generierte Bestandsaufnahme (Setup-only, keine Codeänderungen vorgenommen)

## Technologie-Stack

- Frontend
  - Next.js 14 (App Router), React 18
  - Tailwind CSS, shadcn/ui (über `packages/ui`), `lucide-react`
  - Karten: `maplibre-gl`, `react-map-gl`
  - State/Data: `@tanstack/react-query`, `zod`

- Backend/API
  - Node.js mit Fastify 5
  - Realtime: Server-Sent Events (`fastify-sse-v2`) und WebSocket (`ws`)
  - OpenAPI/Swagger: `@fastify/swagger`, `@fastify/swagger-ui`
  - CORS, Rate-Limit, Under-Pressure (produktionsnah, in TEST_MODE abgeschaltet)

- Monorepo & Tooling
  - npm Workspaces: `apps/*`, `packages/*`
  - TypeScript 5 (strict in Frontend; API mit TS build)
  - Lint/Format: ESLint (Next + @typescript-eslint), Prettier
  - E2E: Playwright (vorhandene Tests im Verzeichnis `tests/`)

## Projektstruktur (Top-Level Übersicht)

```
Geolocation-Mockup/
├─ apps/
│  └─ web/               # Next.js Frontend, App Router, API-Proxies
├─ packages/
│  ├─ api/               # Fastify-Backend (SSE, REST, Swagger)
│  └─ ui/                # UI-Komponenten (shadcn-ähnlich)
├─ docs/                 # Projektdokumentation
├─ tests/                # Playwright E2E
├─ scripts/              # Dev/CI/Preview Hilfsskripte
├─ data/, config/, public/  # Daten & statische Assets
└─ package.json          # Workspaces, Qualitäts- und Verify-Skripte
```

Frontend wichtige Pfade:

- `apps/web/app/api/_lib/upstream.ts` – Upstream-Proxy-Helfer mit Timeout/Fallback
- `apps/web/lib/api.ts` – schlanker Fetch-Wrapper, nutzt `NEXT_PUBLIC_API_BASE`

Backend wichtige Pfade:

- `packages/api/src/server.ts` – Fastify-Server, Plugins, WS-Fallback
- `packages/api/src/plugins/core.ts` – CORS/RateLimit/UnderPressure/Swagger
- `packages/api/src/routes.ts` – REST-Endpunkte (Lines, Trains, ECM, Export, KPIs)
- `packages/api/src/routes/events.ts` – SSE-Stream `/events`

## Abhängigkeiten

- Extern (Auszug)
  - Frontend: `next`, `react`, `react-dom`, `maplibre-gl`, `react-map-gl`, `@tanstack/react-query`, `zod`, `tailwindcss`
  - Backend: `fastify`, `fastify-sse-v2`, `ws`, `@fastify/swagger`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/under-pressure`, `zod`
  - Tooling: `eslint`, `eslint-config-next`, `@typescript-eslint/*`, `prettier`, `playwright`

- Intern
  - Frontend konsumiert Backend-API über `NEXT_PUBLIC_API_BASE` (direkt) und über Next.js API-Routen/Proxy-Helfer (`upstreamJson`)
  - SSE: Frontend verbindet gegen `/events` (Server sendet FeatureCollection-Snapshots)
  - Gemeinsame UI in `packages/ui` per `transpilePackages`

## API-Überblick (Kurz)

- Meta/Health: `GET /health`, `GET /api/health`, `GET /api/meta`, `GET /api/meta/version`
- Daten: `GET /api/lines`, `GET /api/depots`, `GET /api/trains`, `GET /api/trains/:id`
- KPIs/Energie: `GET /api/fleet/health`, `GET /api/energy/budget`, `GET /api/metrics/kpi`
- Export: `GET /api/export/lines`, `GET /api/export/trains?format=xlsx|csv`
- ECM: Policies/Measures/WOs/Signoffs (GET/POST/PATCH), Checklists und Complete-Endpunkte
- Realtime: `GET /events` (SSE), `WS /ws`

Siehe `docs/openapi.yaml` für formale Spezifikation.

## Code-Qualität (erste Einschätzung)

- ESLint & Prettier vorhanden, Konfiguration: `.eslintrc.json`, `.prettierrc`, `.prettierignore`
- Lint-Skripte: `npm run lint`, `npm run lint:baseline`, Format-Checks: `npm run format:check`
- Types: Frontend strikt; API baut auf TS und generiert `dist/`
- Tests: Playwright E2E vorhanden; Verify-Skript startet Dev-Stack und führt Tests aus

Beobachtungen (leichtgewichtig, nicht-blockierend):

- Kommentare überwiegend knapp, ausreichend für Demo-Kontext
- Konsistente Formatierung durch Prettier, keine offensichtlichen Stilbrüche
- Potenzial: OpenAPI-Datei im Repo ergänzen; CI-Workflow für Qualität (Lint/Build) verankern
