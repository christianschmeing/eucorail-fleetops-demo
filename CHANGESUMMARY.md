# Change Summary – AI Observable State + Modern UI adjustments

Scope of this commit series:
- Add GitHub Actions workflow `state.yml` to generate and publish project state to `gh-pages/state/` on push/PR.
- Add internal CI workflow `ci.yml` limited to typecheck/lint/build/test:int (no UI/E2E).
- Implement `scripts/ci/gen-project-state.mjs` for JSON snapshot and Shields endpoint badge.
- Ensure `/state` is not ignored and add docs `docs/AI_README.md`.
- Update `README.md` with State badge and AI Entry Points.
- Modernized homepage UI to `ModernHeader`/`ModernSidebar`, fixed hydration time rendering.

Assumptions/Skips:
- If `STAGING_META_URL` is not set, `data_version` is `null` by design.
- If GitHub API rate limits hit, counts fall back to `-1` and badge shows `•` orange; documented in generator.
- `gh-pages` branch is created/published by `peaceiris/actions-gh-pages` if it does not exist.
- No Playwright/UI steps in CI to honor requirement; only internal checks run best-effort (`|| true`).

Impact:
- After next push to default branch, files available at:
  - `gh-pages/state/project-state.json`
  - `gh-pages/state/badge.json` (used in README badge)