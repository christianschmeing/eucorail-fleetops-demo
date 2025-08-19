# 📋 ANFORDERUNGEN: Reale Linienzuordnung (144 Züge) + ECM-3 Planung & Depotbelegung

## 🎯 AKZEPTANZKRITERIEN (MUSS ERFÜLLT SEIN)

### ✅ = Implementiert | ⚠️ = Teilweise | ❌ = Fehlt

### 1️⃣ **Reale Linien**
- [ ] /lines zeigt nur echte Linien aus lines_real.csv
- [ ] /trains & /map nutzen identische line_codes
- [ ] Filter sind kongruent zwischen allen Views

### 2️⃣ **144-Kohärenz** 
- [ ] /, /map, /trains, /lines = 144 (ungefiltert)
- [ ] Depot-Summe Essingen + Langweid = 144
- [ ] Keine Abweichungen zwischen Views

### 3️⃣ **ECM-3 Planung**
- [ ] /maintenance zeigt rollierende IS-Belegungen (≥12 heute)
- [ ] /depot zeigt Belegungen mit ETA
- [ ] Konfliktlogik funktioniert

### 4️⃣ **LCC/IHB aktiviert**
- [ ] ihb_profiles.yaml wird genutzt
- [ ] fault_rates.yaml wird genutzt
- [ ] Präventive/korrektive/Unfall-Aufgaben erscheinen plausibel

### 5️⃣ **Reserve & Abstellung**
- [ ] Sichtbar und filterbar
- [ ] Summen stimmen View-übergreifend
- [ ] Umlenkung auf Reserve erzeugt /log-Event

### 6️⃣ **Fahrplan-Plausibilität**
- [ ] "aktiv" kollidiert nicht mit Depotbelegung
- [ ] ETA-Warnungen bei drohender Verspätung
- [ ] run_window wird beachtet

### 7️⃣ **/log**
- [ ] 48h Export ≥144 Zeilen
- [ ] Alle 144 train_id kommen vor

---

## 📁 ERFORDERLICHE DATEIEN (SSOT)

### ✅ Vorhanden | ❌ Fehlt

1. ✅ **lines_real.csv** - 17 reale Linien
2. ✅ **fleet_144_assignment_v2.csv** - 144 Züge mit Zuordnungen  
3. ✅ **ihb_profiles.yaml** - IHB/LCC-Profile (FLIRT/Mireo/Desiro)
4. ❌ **depot_tracks.yaml** - Gleisfeatures Essingen/Langweid
5. ✅ **ecm_catalog.yaml** - ECM-2/3/4 Aufgabenkatalog
6. ✅ **fault_rates.yaml** - Ausfallraten pro Subsystem

---

## 🔧 PHASE 1: SINGLE SOURCE OF TRUTH (SSOT)

### Dateien-Schema:

**lines_real.csv**
- route_id, line_code, line_name, operator, region, km_per_day_mean, run_window_start, run_window_end

**fleet_144_assignment.csv**  
- train_id, line_code, region, home_depot, is_reserve, status, notes

**ihb_profiles.yaml**
```yaml
flirt_3_160:
  preventive_intervals:
    IS1: {interval_km: 2000, interval_days: 1}
    IS2: {interval_km: 30000, interval_days: 30}
    IS3: {interval_km: 90000, interval_days: 90}
    IS4: {interval_km: 300000, interval_days: 365}
```

---

## 🚂 PHASE 2: REALE LINIENZUORDNUNG

### Linienverteilung (144 Züge):

| Region | Linien | Fahrzeuge | Depot |
|--------|--------|-----------|-------|
| **BW** | RE1, RE2, RE8, RB22, RB27 | 59 (FLIRT) | Essingen |
| **BY** | RE9, RE12, MEX16, MEX18, MEX12, RB32, RB54 | 49 (Mireo) | Langweid |
| **BY** | S2, S3, S4, S6 | 36 (Desiro) | Langweid |
| **Reserve** | RESERVE | 22 | Beide |

---

## 🔩 PHASE 3: IHB/LCC-PROFILE

### Wartungsintervalle:

| Stufe | Intervall | Arbeiten | Dauer |
|-------|-----------|----------|-------|
| **IS1** | Täglich / 2.000 km | Sichtprüfung | 1-2h |
| **IS2** | 30 Tage / 30.000 km | Öle, Filter, Bremse | 4-8h |
| **IS3** | 90 Tage / 90.000 km | Subsysteme | 12-24h |
| **IS4** | 365 Tage / 300.000 km | Hauptuntersuchung | 48-72h |
| **Lathe** | 150.000 km | Radreprofilierung | 8h |
| **Reinigung** | 7-14 Tage | Wäsche | 2h |

---

## 🛠️ PHASE 4: KORREKTIV & UNFÄLLE

### Ereignisraten (pro 10.000 km):

| Subsystem | Rate | Schwere | Dauer |
|-----------|------|---------|-------|
| Türen | 0.5 | Mittel | 2-4h |
| HVAC | 0.3 | Niedrig | 2-6h |
| Bremse | 0.2 | Hoch | 4-12h |
| TCMS/ETCS | 0.1 | Kritisch | 8-24h |
| Radsätze | 0.15 | Hoch | 8h (Lathe) |

---

## 📅 PHASE 5: ECM-3 PLANUNG

### Planungshorizonte:
- **Kurz**: Heute + 3 Tage (operativ)
- **Mittel**: 7 Tage (Kapazität)
- **Lang**: 30 Tage (IS2/IS3)

### Constraints:
- **Hard**: Gleislänge, Features, Team, Sicherheit
- **Soft**: Korrektiv > Präventiv, min. Umsetzfahrten

---

## 🕐 PHASE 6: FAHRPLAN-BEZUG

### run_window pro Linie:
- RE-Linien: 04:00 - 01:00
- MEX-Linien: 05:00 - 00:00
- RB-Linien: 05:30 - 22:30
- S-Bahn: 04:00 - 01:30

---

## ✅ PHASE 7: APP-WEITE KONSISTENZ

### Einheitliche Status:
- Aktiv | Wartung | Alarm | Reserve | Abstellung | Offline

### Konsistenz-Checks (C1-C5):
1. **C1**: Summe Züge = 144 überall
2. **C2**: Linien-Fahrzeuge = SSOT
3. **C3**: Depot E + L = 144
4. **C4**: Status-Verteilung konsistent
5. **C5**: /log enthält alle train_ids

---

## 🚨 KRITISCHE PRÜFPUNKTE

### MUSS sofort geprüft werden:

1. **Werden die SSOT-Dateien tatsächlich verwendet?**
   - [ ] dataSourceSSOV2.ts lädt lines_real.csv
   - [ ] dataSourceSSOV2.ts lädt fleet_144_assignment_v2.csv
   - [ ] IHB-Profile werden angewendet

2. **Sind alle Views konsistent?**
   - [ ] /map zeigt 144 Züge
   - [ ] /trains zeigt 144 Einträge
   - [ ] /lines summiert zu 144
   - [ ] /maintenance nutzt IHB-Intervalle

3. **Funktioniert die ECM-3 Logik?**
   - [ ] Work Orders folgen IHB-Profilen
   - [ ] Depot-Belegung ist realistisch
   - [ ] Konflikte werden erkannt

4. **Sind Events vollständig?**
   - [ ] /log zeigt genug Events
   - [ ] Alle train_ids kommen vor
   - [ ] ECM-Events werden geloggt
