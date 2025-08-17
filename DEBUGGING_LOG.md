# Debugging Log - Geolocation Mockup

## Status: 14.01.2025

### ✅ Erledigte Aufgaben

1. **Projekt-Analyse durchgeführt**
   - Git-Status überprüft
   - Linting-Fehler identifiziert
   - Code-Struktur analysiert

2. **Identifizierte Probleme**
   - ❌ Fehlende Datei: `packages/api/src/routes/trains.ts`
   - ❌ API Route falsch: `/api/train` statt `/api/trains`
   - ❌ Unvollständiger Code in `packages/api/src/routes.ts`
   - ❌ Test-Timeouts in Playwright Tests

3. **Behobene Probleme**
   - ✅ API Route korrigiert: `/api/trains/:id`
   - ✅ Test-Timeouts erhöht
   - ✅ WaitForSelector vor kritischen Interaktionen hinzugefügt
   - ✅ NetworkIdle statt domcontentloaded für bessere Stabilität

4. **Neue Tools erstellt**
   - `test-smart-runner.js`: Robuster Test-Runner mit automatischer Fehlerbehandlung
     - Mehrere Test-Strategien (full, isolated, minimal)
     - Automatische Port-Bereinigung
     - Timeout-Handling
     - Retry-Mechanismus
   - `quick-test.sh`: Einfaches Test-Script für schnelle Tests

### 🔧 Aktuelle Probleme

1. **Terminal/Shell Issues**
   - PowerShell auf macOS zeigt merkwürdiges Verhalten
   - Befehle werden teilweise nicht korrekt ausgeführt
   - Workaround: Separate Scripts verwenden

2. **Test-Probleme**
   - `sidebar-filters.spec.ts`: Status-Filter-Group nicht sichtbar
   - `train-details-smoke.spec.ts`: Wartungs-Timeline nicht gefunden

### 📋 TODO

- [ ] Tests erfolgreich durchführen
- [ ] Alle Änderungen committen
- [ ] Dokumentation vervollständigen
- [ ] Code-Kommentare hinzufügen

### 🚀 Nächste Schritte

1. Test-Suite stabilisieren
2. CI/CD Pipeline aufsetzen
3. Performance-Optimierungen
4. Vollständige Dokumentation

### 📝 Notizen

- Die Test-Umgebung benötigt spezielle Environment-Variablen:
  - `NEXT_PUBLIC_TEST_MODE=1`
  - `TEST_MODE=1`
  - `SEED=42`
  - `TICK_MS=500`

- Ports die bereinigt werden müssen:
  - 3001: Next.js Web
  - 3002: Alternative Web
  - 4100: API
  - 4101: Alternative API

### 🛠️ Befehle

```bash
# Tests ausführen
npm run test:quick    # Schneller Test
npm run test:smart    # Smart Runner mit Retry
npm run verify        # Original Verify

# Entwicklung
npm run dev           # Start Dev Server
npm run build:all     # Build alle Workspaces

# Cleanup
npm run kill-ports    # Bereinige Ports
```
