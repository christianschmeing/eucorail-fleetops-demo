# TASKS

## P0 (kritisch)
- [x] Train Detailseite `/trains/[id]` mit Tabs Technik / Wartung / Zustand
- [x] MaintenanceTimeline mit kommenden/überfälligen Services, Farbcodes
- [x] Branding: Tailwind Tokens + Badge/Button/Card/Tabs/StatusChip (Eucorail)
- [x] Startseite KPI-Header (Basis) + konsistente Panels
- [ ] CI Basis: build, lint, typecheck, smoke (Playwright headless)

## P1
- [ ] KPI-Header (Verfügbarkeit, Ø Verspätung, aktive Störungen)
- [ ] Map-Marker-Verbesserung: vereinfachte Polylinien + Status-Badges
- [ ] API-/Mock-Adapter mit `.env.example` und Sample-Seeds

## P2
- [ ] Wartungs-Backlog mit Filtern (Depot, Baureihe, Fälligkeit)
- [ ] Export/Share (CSV/PDF) für Wartungspläne
- [ ] Leichte Offline-Robustheit (Retry/Backoff, Stale-While-Revalidate)

## Definition of Done
- Lint/Typecheck/Build grün ODER Skip+Begründung in CHANGESUMMARY.md
- Mind. 1 Smoke-Test je kritischem Flow (Route/Tab/Timeline)
- A11y-Basics (Tab-Flow, Focus sichtbar, Kontraste ≥ 4.5:1)


