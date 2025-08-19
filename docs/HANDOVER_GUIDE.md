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
