## Background Autopilot Guardrails (P1)

- MODE: No Terminal usage; only file edits, commits, push, PR updates via existing CI/preview workflows.
- Small Deltas: ≤ 5 files per commit; keep edits scoped and reversible.
- Zero Placeholders: ship working code and docs only; no stubs.
- Logging Discipline: update `CHANGESUMMARY.md` after each block with clear, brief impact notes and any [SKIPPED:<reason>] items.
- On Error: if a step cannot be completed safely, mark as `[SKIPPED:<reason>]` and proceed to next block.
- Tests/Selectors: prefer stable locators (data-testid, roles); avoid magic timeouts.
- Perf Budgets: respect initialJS.gz budgets and API p95 targets stated in the plan.
