# Projektziele – Professionalisierung (Setup-first, ohne Funktionsänderungen)

Zeitrahmen: 3-4 Wochen (W1–W4). Fokus: Infrastruktur, Qualität, Dokumentation, CI/CD. Keine inhaltlichen Änderungen am Produktverhalten.

## Struktur

- Bis Ende W2: Projektstruktur formalisieren und dokumentieren.
  - Ziel: Frontend (`apps/web`), Backend (`packages/api`) und UI (`packages/ui`) klar beschrieben.
  - Optional: Skript `refactor_structure.sh` bereitstellen (zunächst No-Op), um künftige Migration zu `/frontend`, `/backend`, `/packages/api-client` zu erleichtern.

## Dokumentation

- Bis Ende W2: `PROJECT_AUDIT.md` und Architekturbild `docs/architecture/system_overview.md` vorhanden.
- Bis Ende W3: OpenAPI 3.0 Spezifikation `docs/openapi.yaml` deckt mindestens 90% der Endpunkte ab.
- Bis Ende W3: Handover-Guide `docs/HANDOVER_GUIDE.md` mit Troubleshooting.

## Automatisierung & Qualität

- Sofort (W1): ESLint/Prettier verankert (bereits vorhanden) und `.editorconfig` ergänzen.
- Bis Mitte W2: CI-Workflow `.github/workflows/ci.yml` (Format, Lint, Build; optional Tests).
- Bis Ende W3: Befehle `cursor:verify` und `cursor:update-snapshots` verfügbar.

## Tests

- Kurzfristig: Vorhandene E2E-Tests bewahren; keine flakey Waits.
- Mittelfristig (W3–W4): Baseline-Komponententests (Render + Interaktion) mit `data-testid`.

## Deployment

- Bis Ende W4: Dokumentierte Verbindung GitHub ↔ Vercel (`docs/DEPLOYMENT_VERCEL.md`), sichere ENV-Verwaltung und Auto-Deploy bei Merge auf `main`.

## Messbare Outcomes

- CI grün auf PRs und `main` (Format/Lint/Build erfolgreich).
- `docs/openapi.yaml` aktuell und von UI genutzt (mind. 90% Endpunkte).
- Onboarding: Lokalstart in unter 30 Minuten auf Basis README und Handover.
