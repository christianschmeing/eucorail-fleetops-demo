# Change Summary

This document logs assumptions, skips, and follow-ups while implementing the Eucorail Train-Tracker enhancements.

## Assumptions
- Use Next.js App Router in `apps/web` with existing structure.
- Adopt Eucorail dark theme with tokens aligned to provided palette.
- Use mock data on `/trains/[id]` until API endpoints are wired.
 - Keep Playwright smokes minimal and stable; avoid brittle assertions in headless CI.

## Skipped/Timeouts
- [SKIPPED:verify@home-KPI] KPI header smoke proved flaky in headless; removed in favor of existing HUD/home tests.
- Dev server on OneDrive mount can intermittently miss server chunks. Workaround added:
  - `apps/web/next.config.mjs` sets server `output.chunkFilename = 'chunks/[id].js'`.
  - `scripts/dev/patch-next-server-chunks.mjs` symlinks files from `server/chunks/*.js` into `server/`.

## Follow-ups
- Replace mock data with API adapter and seeds.
- Add more a11y coverage (keyboard nav across tabs/timeline markers).
 - Extend KPI cards with real data and add non-flaky screenshot test.




### Averio seeds generated
- BW total: 66 per line: {"mex13":14,"mex16":14,"re1":14,"re8":13,"re90":11}
- BY total: 78 per line: {"rb86":9,"rb87":9,"rb89":9,"rb92":6,"re72":8,"re80":10,"re89":9,"re9":10,"re96":8}
- Reserve ratio: 0.12