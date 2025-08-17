# Change Summary – AI Observable State + Modern UI adjustments

Scope of this commit series:
- Add GitHub Actions workflow `state.yml` to generate and publish project state to `gh-pages/state/` on push/PR.
- Add internal CI workflow `ci.yml` limited to typecheck/lint/build/test:int (no UI/E2E).
- Implement `scripts/ci/gen-project-state.mjs` for JSON snapshot and Shields endpoint badge.
- Ensure `/state` is not ignored and add docs `docs/AI_README.md`.
- Update `README.md` with State badge and AI Entry Points.
- Modernized homepage UI to `ModernHeader`/`ModernSidebar`, fixed hydration time rendering.

Assumptions/Skips:
- If `STAGING_META_URL` is not set, `data_version` is `null` by design. Fetch uses 4s timeout; parse supports {version|dataVersion} or raw string; on HTTP errors -> null.
- If GitHub API rate limits hit, counts fall back to `-1` and badge shows `•` orange; documented in generator. Generator exits 0 always.
- `gh-pages` branch is created/published by `peaceiris/actions-gh-pages` if it does not exist.
- No Playwright/UI steps in CI to honor requirement; only internal checks run best-effort (`|| true`).

Impact:
- After next push to default branch, files available at:
  - `gh-pages/state/project-state.json`
  - `gh-pages/state/badge.json` (used in README badge)

Enhancements:
- Badge rule: shows `main@<sha>` when branch is `main`, otherwise `<branch>@<sha>`; color scheme success=brightgreen, failed=red, skipped/unknown=orange.
- State workflow supports `workflow_dispatch` for manual runs; optional `schedule` added (commented) with hourly cron.
- data_version fetched from STAGING_META_URL with 4s timeout; supports JSON {version|dataVersion} or raw string.

P0 Increment 1 – Tables + Facetten + Export
- Implemented headless virtualized `TableView` with `useVirtualWindow` (windowing, sticky header).
- /trains and /lines now render fast tables with search + basic status/line filters and CSV export (current view only).
- Saved Views (localStorage) deferred to next slice. XLSX export deferred (CSV in place).

Map Flow polish (first pass)
- Basic flyTo per selected line bounds; drawer actions wired from selection. Further geo‑lookup TBD.

Start URL
- Web: http://localhost:3002 (API 4100)