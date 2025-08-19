# 🚂 Eucorail FleetOps - Präsentationsleitfaden

## 🔗 Live-System
**URL:** https://geolocation-mockup-hz942t15e-christian-schmeings-projects.vercel.app

## 🎯 Kernfeatures für Live-Demo

### 1. **Dashboard** (Startseite)
✅ **144 Fahrzeuge** - Vollständige Flotte
- 59x Stadler FLIRT (Baden-Württemberg)
- 49x Siemens Mireo H2 (Bayern) 
- 36x Siemens Desiro HC (S-Bahn)
- **22 Reserve-Fahrzeuge** (verteilt auf beide Depots)

**Live-Metriken:**
- Verfügbarkeit: ~75%
- MTBF: 428h / MTTR: 2.4h
- ECM-Compliance: 92.3%
- Depot-Auslastung in Echtzeit

### 2. **Live-Karte** (/map)
🗺️ **Echtzeit-Positionen**
- Alle 144 Züge auf der Karte
- Farbcodierung nach Status
- Klickbare Marker mit Details
- Filter nach:
  - Linien (RE, MEX, RB, S-Bahn)
  - Status (Aktiv, Wartung, Reserve)
  - Depot (Essingen, Langweid)

### 3. **ECM Wartungsmanagement** (/maintenance)
🔧 **IHB-basierte Wartung**
- **ECM-Level Gruppierung:**
  - ECM-2: Wartungsentwicklung
  - ECM-3: Wartungsmanagement  
  - ECM-4: Durchführung

- **Fahrzeugspezifische Intervalle:**
  - FLIRT: IS1 täglich, IS2 45 Tage, IS3 180 Tage, IS4 2 Jahre
  - Mireo H2: Spezielle H2-Checks, IS2 40 Tage
  - Desiro HC: Schwerlast-Profile, IS4 3 Jahre

- **14-Tage Kapazitätsvorschau**
- **Risikoteile-Management**

### 4. **Fahrzeugübersicht** (/trains)
📊 **Detaillierte Flottendaten**
- Fahrzeugtyp-Spalten
- Reserve-Status-Anzeige
- Kilometerstände
- Heimat-Depot
- CSV-Export (144 Einträge)

### 5. **Linienverwaltung** (/lines)
🚊 **17 reale Linien**
- **Regional-Express:** RE1, RE2, RE8, RE9, RE12
- **Metropol-Express:** MEX12, MEX16, MEX18
- **Regionalbahn:** RB22, RB27, RB32, RB54
- **S-Bahn:** S2, S3, S4, S6
- Betriebsfenster & km/Tag pro Linie

### 6. **Event-Log** (/log)
📝 **Vollständige Abdeckung**
- Events für alle 144 Züge
- Wartungsereignisse
- Statusänderungen
- Depot-Bewegungen
- Filter & Suche

## 🎭 Demo-Szenarien

### Szenario 1: "Flotten-Übersicht"
1. **Dashboard** öffnen → 144 Fahrzeuge bestätigen
2. Fahrzeugtyp-Verteilung zeigen (FLIRT/Mireo/Desiro)
3. Reserve-Pool hervorheben (22 Züge)
4. MTBF/MTTR-Metriken erklären

### Szenario 2: "Live-Tracking"
1. **Map** öffnen
2. Auf BW zoomen → Essingen-Flotte
3. Auf BY zoomen → Langweid-Flotte  
4. Filter demonstrieren
5. Zug-Details per Klick

### Szenario 3: "ECM-Compliance"
1. **Maintenance** öffnen
2. ECM-Level erklären
3. IHB-Profile zeigen
4. Fahrzeugtyp-spezifische Wartung
5. Depot-Kapazität prüfen

### Szenario 4: "Daten-Export"
1. **Trains** öffnen
2. Alle 144 Einträge zeigen
3. CSV-Export demonstrieren
4. Konsistenz bestätigen

## 📈 Technische Highlights

### Datenintegrität
- **Single Source of Truth (SSOT V2)**
- Konsistente 144 Züge über alle Views
- Reale Linienzuordnungen
- IHB/LCC-konforme Wartungsprofile

### Performance
- Server-Side Rendering (SSR)
- Optimierte Tabellen-Virtualisierung
- Echtzeit-Updates via SSE
- Edge Runtime für API

### Compliance
- ECM-3 Zertifizierung ready
- Fahrzeugtyp-spezifische Profile
- Depot-Feature-Management
- Fehlerraten-Tracking

## ⚠️ Bekannte Demo-Punkte

### Stärken betonen:
✅ Vollständige 144-Zug-Kohärenz
✅ Reale Linien & Depots
✅ IHB-konforme Wartung
✅ ECM-Level-Integration
✅ Reserve-Management

### Erklären falls gefragt:
- Positionen sind simuliert (keine echte GPS-Integration)
- Events werden generiert (Demonstrationszwecke)
- Wartungsdaten sind Beispielwerte

## 🚀 Quick-Links für Präsentation

1. **Hauptsystem:** https://geolocation-mockup-hz942t15e-christian-schmeings-projects.vercel.app
2. **Dashboard:** /dashboard
3. **Live-Karte:** /map
4. **ECM-Wartung:** /maintenance
5. **Fahrzeuge:** /trains
6. **Linien:** /lines
7. **Events:** /log

## 💡 Präsentations-Tipps

1. **Start mit Dashboard** - Zeigt Gesamtübersicht
2. **Dann zur Karte** - Visualisiert die Flotte
3. **ECM-Features** - Technische Tiefe demonstrieren
4. **Mit Export enden** - Datenqualität beweisen

## 📱 Responsive Design
- Funktioniert auf Tablet & Desktop
- Optimiert für 1920x1080 Präsentationen
- Dark Mode für bessere Projektion

---

**Präsentationsdauer:** ~10-15 Minuten
**Fokus:** Datenkonsistenz, ECM-Integration, Reale Linien
**Zielgruppe:** Management & Technische Stakeholder
