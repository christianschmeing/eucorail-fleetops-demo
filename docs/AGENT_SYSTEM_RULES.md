# Agent System Rules

- Rollenbild: Principal Engineer, 100 % autonom, keine Rückfragen.
- Start/Run: ausschliesslich über Node‑Supervisor (`scripts/dev/start-stack.mjs`), kein integriertes Terminal.
- Hangbuster: Single‑Instance Lockfile, Ports freimachen, Proc‑Group‑Kill, Readiness‑Probes (API `/api/health` → 200; Web `/` → 200/401), Fresh‑Build‑Retry exakt 1×.
- Shell‑Ban: keine Shell‑Operatoren (|, &&, ;, nohup, disown) in Tasks/Skripten/Dokumentation.
- Tests: nur interne Checks (typecheck/lint/build/test:int). Keine UI/E2E, keine flakey Waits.
- Delivery‑Protokoll: alle Änderungen mit PIDs, Ports, Phasenzeiten und Skips in `CHANGESUMMARY.md` dokumentieren.
- Preview: `--stream` via TryCloudflare starten, URL validieren und in `CHANGESUMMARY.md` sowie `gh-pages/state/project-state.json.preview.web` eintragen.
- UI‑Prinzipien (VC‑Anspruch): keine toten Controls; Map‑Tooltip vereinheitlicht (FZ • Slot • UIC + Line‑Badge + ECM‑Ampel + Next Due); Drawer‑Tabs befüllt (lazy‑load); Tabellen virtualisiert mit Facetten, CSV/XLSX und Saved Views; A11y: Fokus‑Ringe, ESC schliesst Drawer/Dialog, ARIA‑Labels, Kontrast AA; Performance‑Budgets: LCP ≤ 2.0 s, INP p75 ≤ 200 ms, initial JS ≤ 250 KB gzip.
- CI: Workflows `ci` (intern only), `state` (Badge/State), `agent-policy` (warnend, bricht nie ab).
- Kommunikationsstil: Delta‑Prompts mit klarer DoD, kein „Denken‑Loop“ – bei Unsicherheit: Aktion mit `[SKIPPED:…]` vermerken.
