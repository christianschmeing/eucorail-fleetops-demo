# HANDOVER GUIDE

Zweck: Schnelle Übergabe an neue Teammitglieder – ohne Änderung des Produktverhaltens.

## Inhalte & Reihenfolge

- `README.md` – Einstieg, lokale Entwicklung, Skripte
- `PROJECT_AUDIT.md` – aktueller Projektzustand (Tech/Struktur/Abhängigkeiten)
- `docs/architecture/system_overview.md` – Architekturdiagramm (Mermaid)
- `docs/openapi.yaml` – API-Referenz (OpenAPI 3)
- `tests/` – Playwright E2E Tests (als Referenz für Flows)

## Lokale Einrichtung (Kurz)

1. Node 20 und npm >= 9 installieren
2. `npm install`
3. `npm run dev` oder Supervisor `npm run dev:stack:zsh`
4. Web: http://localhost:3002, API: http://localhost:4100

## CI/CD (Kurz)

- CI: `.github/workflows/ci.yml` prüft Format, Lint und Build auf PRs & main
- Preview: `.github/workflows/preview.yml` liefert bei PRs eine kommentierte, getestete Preview‑URL.
- Release: `.github/workflows/release-verify.yml` wartet nach Push auf `main` auf die Production‑URL, testet sie (Playwright) und publiziert die getestete URL als Artifact.

## Deployment & Richtlinien (Standard)

- Produktions‑Deploy: `.github/workflows/deploy-production.yml` (Standard‑Pfad)
  - Trigger:
    - push auf `main`
    - PR Label (Event `pull_request: labeled`)
    - manuell via `workflow_dispatch` (mit Inputs)
    - wöchentlich (Mo 02:00) via `schedule`
  - Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
  - Schritte: `vercel pull` → `vercel build` → `vercel deploy --prod` → Health/Route‑Checks → optionale Smoke‑Tests

### Hotfix/Notfall (nur wenn CI blockiert)

- Direkte Vercel‑CLI Deploys sind nur als Ausnahme gedacht:
  - `npm run deploy:preview` – Preview Deploy via Vercel CLI
  - `npm run deploy:prod` – Production Deploy via Vercel CLI (immutable URL)
  - `npm run deploy:direct` – geführtes Script (Preview/Prod)
    Hinweis: Dieser Weg umgeht CI‑Gates. Nach Hotfix bitte PR nachziehen, damit Historie konsistent ist.

- Fallback Workflow: `.github/workflows/deploy-fallback.yml`
  - Manuell (`workflow_dispatch`) oder durch Commit der Datei `DEPLOY_NOW` auf `main`.

- Lokale Workflow‑Tests (Optional):
  - `.actrc` ist vorkonfiguriert (Node 20, .env.local als Secret/Env)
  - Beispiel: `act push -W .github/workflows/deploy-production.yml --dry-run`

- Dokumentation & Einstieg:
  - README‑Sektion „Deployment“ beschreibt alle Wege inkl. Troubleshooting.
  - `.env.example` Template: Zugangsdaten in `.env.local` eintragen.

### Qualitätsrichtlinien (verbindlich)

1. Vor jedem Push: `npm run verify` lokal ausführen (Build + E2E)
2. Commits: Conventional Commits, Header ≤ 100 Zeichen
3. E2E: Visuelle Tests nur bei Bedarf; Selektoren via `data-testid`, keine magischen Timeouts
4. SSR‑First: Neue Seiten initial SSR, danach progressive Enhancement
5. Playwright‑Screenshots: Nur mit Begründung aktualisieren
6. Vor Deploy: Health‑Checks `/api/health`, wichtige Routen prüfen

### PR‑Richtlinie (Checkliste)

Nutze die PR‑Template‑Checkliste (siehe `.github/PULL_REQUEST_TEMPLATE.md`):

- [ ] `npm run verify` lokal erfolgreich
- [ ] Deployment‑Pfad klar (Preview/Prod/Direct)
- [ ] Secrets/Env geprüft (keine Leaks, `.env.local` nicht committed)
- [ ] Dokumentation aktualisiert (README/Handover/Changelog)
- [ ] Tests angepasst/ergänzt (inkl. data-testid)

## Troubleshooting

- Ports belegt: `npm run kill-ports`
- E2E flakey: Rate-Limit/Under-Pressure im TEST_MODE deaktiviert; `NEXT_PUBLIC_TEST_MODE=1`
- Upstream-Proxy: `apps/web/app/api/_lib/upstream.ts` (Timeout/Fallback) prüfen
- SSE/WS: Bei CORS/Proxy-Themen `packages/api/src/plugins/core.ts` und Browser-Console prüfen

## Wichtige Ansprechpartner (Platzhalter)

- Product/Owner: <Name / Kontakt>
- Tech Lead (Frontend): <Name / Kontakt>
- Tech Lead (Backend): <Name / Kontakt>
- DevOps/CI: <Name / Kontakt>
