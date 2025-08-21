# Workflow Verbesserungen (non-destructive)

## Hinzugefügt (nicht ersetzt)

- Health Checks (soft-fail) via `.github/workflows/deploy-production.yml`
- Optionale Smoke Tests (blockieren nicht)
- Rollback Helper Workflow (`rollback-helper.yml`)
- `scripts/health-check.js` und npm alias `health:check`, `test:smoke`

## Bestehende Prozesse (unverändert)

- Preview + Test Workflow (`preview.yml`)
- CI (`ci.yml`), Release Verify (`release-verify.yml`)
- Deploy Production (Vercel) — erweitert, nicht ersetzt
- Playwright-Konfiguration und bestehende E2E-Tests

## Optionale Flags

- Smoke Tests laufen nur, wenn Playwright verfügbar ist
- Alle neuen Steps sind non-blocking (continue-on-error) außer Route-Health

## Rollback

1. GitHub Actions → Rollback Helper → Run workflow
2. Oder Vercel Dashboard → vorheriges Deployment → Promote to Production
3. Git: `git revert <commit>` falls Code-Rollback nötig
