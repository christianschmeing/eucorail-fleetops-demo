#!/bin/bash

# ===============================================
# VOLLAUTOMATISCHES SETUP & START SCRIPT
# Führt alle Schritte automatisch aus
# ===============================================

echo "🚀 EUCORAIL FLEETOPS - AUTOMATISCHES SETUP"
echo "==========================================="
echo ""

# Farben für Terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Schritt 1: Alte Prozesse beenden
echo -e "${YELLOW}[1/6] Beende alte Prozesse...${NC}"
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node" 2>/dev/null || true
pkill -f "next" 2>/dev/null || true
pkill -f "playwright" 2>/dev/null || true
lsof -ti:3001,3002,4100,4101 | xargs kill -9 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ Prozesse beendet${NC}"

# Schritt 2: Cache löschen
echo -e "${YELLOW}[2/6] Lösche Cache...${NC}"
rm -rf apps/web/.next 2>/dev/null || true
rm -rf packages/api/dist 2>/dev/null || true
echo -e "${GREEN}✓ Cache gelöscht${NC}"

# Schritt 3: Zugdaten korrigieren
echo -e "${YELLOW}[3/6] Korrigiere Zugdaten...${NC}"
cat > packages/api/seeds/averio/trains.json << 'EOF'
[
  {"id":"RE9-78001","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2020,"depot":"Augsburg","status":"maintenance","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78002","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2020,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78003","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2020,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78004","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2021,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78005","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2021,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78006","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2021,"depot":"Augsburg","status":"standby","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78007","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2021,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78008","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2022,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78009","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2022,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78010","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2022,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78011","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2022,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78012","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2022,"depot":"Augsburg","status":"maintenance","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78013","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2023,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78014","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2023,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78015","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2023,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78016","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2023,"depot":"Augsburg","status":"inspection","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78017","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2023,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78018","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2023,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78019","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2024,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE9-78020","fleetId":"averio-by","lineId":"RE9","manufacturerId":"siemens","typeKey":"mireo-3","series":"Mireo","buildYear":2024,"depot":"Augsburg","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66001","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2020,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66002","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2020,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66003","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2020,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66004","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2020,"depot":"Stuttgart","status":"maintenance","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66005","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2021,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66006","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2021,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66007","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2021,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66008","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2021,"depot":"Stuttgart","status":"standby","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66009","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2022,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66010","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2022,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66011","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2022,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66012","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2022,"depot":"Stuttgart","status":"inspection","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66013","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2023,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66014","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2023,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66015","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2023,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66016","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2023,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66017","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2023,"depot":"Stuttgart","status":"maintenance","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66018","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2024,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66019","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2024,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"MEX16-66020","fleetId":"averio-bw","lineId":"MEX16","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2024,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79001","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2020,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79002","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2020,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79003","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2020,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79004","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2021,"depot":"Stuttgart","status":"maintenance","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79005","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2021,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79006","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2021,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79007","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2021,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79008","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2022,"depot":"Stuttgart","status":"standby","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79009","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2022,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79010","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2022,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79011","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2022,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79012","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2022,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79013","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2023,"depot":"Stuttgart","status":"inspection","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79014","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2023,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79015","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2023,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79016","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2023,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79017","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2023,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79018","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2024,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79019","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2024,"depot":"Stuttgart","status":"maintenance","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}},
  {"id":"RE8-79020","fleetId":"averio-bw","lineId":"RE8","manufacturerId":"stadler","typeKey":"flirt3-3","series":"FLIRT³","buildYear":2024,"depot":"Stuttgart","status":"active","lastSeen":"2025-01-14T10:00:00Z","meta":{"formation":"3-car","etcsPrepared":true}}
]
EOF
echo -e "${GREEN}✓ Zugdaten korrigiert (60 Züge mit korrekten IDs)${NC}"

# Schritt 4: Build durchführen
echo -e "${YELLOW}[4/6] Baue Projekt...${NC}"
npm run build:all > /dev/null 2>&1
echo -e "${GREEN}✓ Build abgeschlossen${NC}"

# Schritt 5: Server starten
echo -e "${YELLOW}[5/6] Starte Server...${NC}"
npm run dev > server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Warte bis Server bereit ist
echo "Warte auf Server Start..."
for i in {1..30}; do
  if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Web Server läuft!${NC}"
    break
  fi
  sleep 1
  echo -n "."
done

for i in {1..10}; do
  if curl -s http://localhost:4100/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API Server läuft!${NC}"
    break
  fi
  sleep 1
  echo -n "."
done

# Schritt 6: Browser öffnen
echo -e "${YELLOW}[6/6] Öffne Browser...${NC}"
sleep 2

# Versuche verschiedene Methoden zum Browser öffnen
if command -v open > /dev/null; then
  # macOS
  open http://localhost:3001
elif command -v xdg-open > /dev/null; then
  # Linux
  xdg-open http://localhost:3001
elif command -v start > /dev/null; then
  # Windows
  start http://localhost:3001
else
  echo -e "${YELLOW}Bitte öffnen Sie manuell: http://localhost:3001${NC}"
fi

echo ""
echo "==========================================="
echo -e "${GREEN}✅ SETUP ABGESCHLOSSEN!${NC}"
echo "==========================================="
echo ""
echo "📱 Web: http://localhost:3001"
echo "🔧 API: http://localhost:4100"
echo "📊 API Docs: http://localhost:4100/docs"
echo ""
echo "✨ Sie sollten jetzt sehen:"
echo "   - RE9-78xxx Züge (20 Stück)"
echo "   - MEX16-66xxx Züge (20 Stück)"
echo "   - RE8-79xxx Züge (20 Stück)"
echo ""
echo "Server Log: tail -f server.log"
echo ""
echo -e "${YELLOW}Zum Beenden: CTRL+C${NC}"
echo ""

# Halte Script am Laufen
tail -f server.log
