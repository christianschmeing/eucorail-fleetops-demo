# 🚀 Vercel Deployment URLs

## Erwartete Preview URLs nach Deployment:

### Production (main branch):
```
https://eucorail-fleetops-demo-git-main-christian-schmeings-projects.vercel.app
```

### Depot Map Feature:
```
https://eucorail-fleetops-demo-git-main-christian-schmeings-projects.vercel.app/depot/map
```

### Alternative URLs (je nach Vercel Projekt-Setup):
- https://eucorail-fleetops-demo.vercel.app
- https://eucorail-fleetops-demo-christian-schmeings-projects.vercel.app

## Lokaler Test (sofort verfügbar):

```bash
# Server starten
npm run up

# Depot Map öffnen
open http://localhost:3001/depot/map
```

## Features auf /depot/map:

✅ **Implementiert:**
- Depot-Switcher (Essingen / Langweid)
- MapLibre GL Karte mit Gleisgeometrien
- Sidebar mit Filtern (Status, IS-Stufe, Linie, Features)
- Inspector Panel (Belegung, Bewegung, Konflikte, Kapazität)
- KPI Bar (Züge im Depot, Auslastung, On-time Rate)
- Simulierte Daten (mind. 10 Züge pro Depot)
- Drag & Drop für Zugzuweisung
- SSR-first Implementation

## Visueller Test-Checklist:

1. [ ] Karte lädt mit Depot-Perimeter
2. [ ] Gleise werden farbcodiert angezeigt (frei=grün, belegt=gelb, gesperrt=rot)
3. [ ] Züge erscheinen entlang der Gleisachsen
4. [ ] Sidebar zeigt Gleisbelegung
5. [ ] KPI Bar zeigt Metriken
6. [ ] Depot-Wechsel funktioniert
7. [ ] Filter funktionieren
8. [ ] Inspector zeigt Details bei Klick

## GitHub Repository:
https://github.com/christianschmeing/eucorail-fleetops-demo

---
*Letzte Aktualisierung: $(date)*
