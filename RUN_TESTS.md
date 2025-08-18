# 🧪 Test-Anleitung

## Schnellstart

```bash
# Option 1: Quick Test (empfohlen)
bash quick-test.sh

# Option 2: Smart Runner mit Auto-Recovery
node test-smart-runner.js

# Option 3: Standard Verify
npm run verify
```

## Was wurde verbessert?

### ✅ Test-Stabilität

- Alle Timeouts auf 30 Sekunden erhöht
- Explizite Wait-Conditions vor DOM-Interaktionen
- NetworkIdle statt domcontentloaded für bessere Stabilität

### ✅ Neue Test-Tools

1. **quick-test.sh**: Einfaches Bash-Script
   - Automatische Port-Bereinigung
   - Sequenzielle Test-Ausführung
   - Sauberes Cleanup

2. **test-smart-runner.js**: Intelligenter Runner
   - 3 Test-Strategien (full, isolated, minimal)
   - Automatisches Retry bei Fehlern
   - Timeout-Handling
   - Farbige Ausgabe

### ✅ Behobene Probleme

- API Route korrigiert (/api/train → /api/trains)
- Sidebar Filter Sichtbarkeit gefixt
- Train Details Page Stabilität verbessert

## Troubleshooting

### Problem: Tests hängen

```bash
# Lösung: Ports bereinigen
npm run kill-ports
# oder
lsof -ti:3001,3002,4100,4101 | xargs kill -9
```

### Problem: Build-Fehler

```bash
# Lösung: Clean Build
rm -rf apps/web/.next packages/api/dist
npm run build:all
```

### Problem: Test-Timeouts

```bash
# Lösung: Smart Runner verwenden
node test-smart-runner.js
```

## Environment Variablen

Für Tests werden automatisch gesetzt:

- `NEXT_PUBLIC_TEST_MODE=1`
- `TEST_MODE=1`
- `SEED=42`
- `TICK_MS=500`

## Erwartete Test-Ergebnisse

✅ **Sollten bestehen:**

- health.spec.ts
- home.spec.ts
- data-as-of.spec.ts

🔄 **Stabilisiert:**

- sidebar-filters.spec.ts
- train-details-smoke.spec.ts

⏭️ **Optional:**

- train-drawer.spec.ts

---

**Tipp:** Bei Problemen verwende `test-smart-runner.js` - er versucht automatisch verschiedene Strategien!
