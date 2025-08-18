# ⚠️ WICHTIG: Server MUSS neu gestartet werden!

## Das Problem

Der Server hat die alten falschen Zugdaten (BW-xxx) im Speicher gecacht.
Die neuen korrekten Zugdaten (RE9-78xxx, MEX16-66xxx, RE8-79xxx) sind bereits gespeichert, aber der Server muss sie neu laden.

## 🔴 Stoppen Sie den laufenden Server

**Im Terminal wo npm run dev läuft:**

- Drücken Sie **Ctrl+C** (zweimal wenn nötig)

## 🟢 Server neu starten

**In einem Terminal:**

```bash
cd /Users/christianschmeing/Library/CloudStorage/OneDrive-EUCORailAG/Documents\ C/Geolocation-Mockup
npm run dev
```

## ✅ Dann im Browser

1. Öffnen Sie http://localhost:3001
2. Hard Refresh: **Cmd+Shift+R** (Mac)
3. Warten Sie 5 Sekunden

## Was Sie sehen sollten

- ✅ Sidebar zeigt RE9-78xxx, MEX16-66xxx, RE8-79xxx Züge
- ✅ Mindestens 30 Züge in der Liste
- ✅ Filter funktionieren
- ✅ Züge bewegen sich auf der Karte

## Falls immer noch Probleme

**Option 1: Komplett neu starten**

```bash
# Alles stoppen
pkill -f node
pkill -f npm

# Cache löschen und neu starten
cd /Users/christianschmeing/Library/CloudStorage/OneDrive-EUCORailAG/Documents\ C/Geolocation-Mockup
rm -rf apps/web/.next
npm run dev
```

**Option 2: API direkt prüfen**
Öffnen Sie: http://localhost:4100/api/trains

Sie sollten JSON mit RE9-78xxx, MEX16-66xxx, RE8-79xxx sehen.

---

**Der Server MUSS neu gestartet werden, damit die korrekten Zugdaten geladen werden!**
