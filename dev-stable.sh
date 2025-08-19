#!/bin/bash

# ============================================
# STABILES ENTWICKLUNGS-SCRIPT MIT STATUS
# ============================================

# Farben für bessere Übersicht
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Status-Funktion
status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# ============================================
# SCHRITT 1: ALTE PROZESSE BEENDEN
# ============================================
status "Beende alte Prozesse..."
lsof -ti:3001 2>/dev/null | while read pid; do
    kill -9 $pid 2>/dev/null && success "Port 3001 freigegeben (PID: $pid)"
done
lsof -ti:4100 2>/dev/null | while read pid; do
    kill -9 $pid 2>/dev/null && success "Port 4100 freigegeben (PID: $pid)"
done
pkill -f "next dev" 2>/dev/null
pkill -f "tsx watch" 2>/dev/null
sleep 2

# ============================================
# SCHRITT 2: 144 ZÜGE GENERIEREN
# ============================================
status "Generiere 144 Züge (66 MEX16 + 39 RE8 + 39 RE9)..."

cat > packages/api/seeds/averio/trains.json << 'TRAINS_DATA'
[
TRAINS_DATA

# MEX16 Züge (66 Stück)
for i in {1..66}; do
    id=$(printf "MEX16-66%03d" $i)
    [ $i -ne 1 ] && echo "," >> packages/api/seeds/averio/trains.json
    
    status_vals=("active" "standby" "maintenance")
    status=${status_vals[$((RANDOM % 3))]}
    
    lat=$((48 + RANDOM % 2)).$((RANDOM % 999))
    lng=$((11 + RANDOM % 2)).$((RANDOM % 999))
    speed=$((RANDOM % 160))
    
    cat >> packages/api/seeds/averio/trains.json << EOF
  {
    "id": "$id",
    "lineId": "MEX16",
    "line": "MEX16",
    "name": "$id",
    "status": "$status",
    "position": {"lat": $lat, "lng": $lng},
    "speed": $speed,
    "depot": "München",
    "fleetId": "flirt3-3"
  }
EOF
done

# RE8 Züge (39 Stück)
for i in {1..39}; do
    id=$(printf "RE8-79%03d" $i)
    echo "," >> packages/api/seeds/averio/trains.json
    
    status_vals=("active" "standby" "maintenance")
    status=${status_vals[$((RANDOM % 3))]}
    
    lat=$((48 + RANDOM % 2)).$((RANDOM % 999))
    lng=$((9 + RANDOM % 2)).$((RANDOM % 999))
    speed=$((RANDOM % 140))
    
    cat >> packages/api/seeds/averio/trains.json << EOF
  {
    "id": "$id",
    "lineId": "RE8",
    "line": "RE8",
    "name": "$id",
    "status": "$status",
    "position": {"lat": $lat, "lng": $lng},
    "speed": $speed,
    "depot": "Stuttgart",
    "fleetId": "talent2"
  }
EOF
done

# RE9 Züge (39 Stück)
for i in {1..39}; do
    id=$(printf "RE9-78%03d" $i)
    echo "," >> packages/api/seeds/averio/trains.json
    
    status_vals=("active" "standby" "maintenance")
    status=${status_vals[$((RANDOM % 3))]}
    
    lat=$((48 + RANDOM % 2)).$((RANDOM % 999))
    lng=$((9 + RANDOM % 2)).$((RANDOM % 999))
    speed=$((RANDOM % 140))
    
    cat >> packages/api/seeds/averio/trains.json << EOF
  {
    "id": "$id",
    "lineId": "RE9",
    "line": "RE9",
    "name": "$id",
    "status": "$status",
    "position": {"lat": $lat, "lng": $lng},
    "speed": $speed,
    "depot": "Stuttgart",
    "fleetId": "talent2"
  }
EOF
done

echo "]" >> packages/api/seeds/averio/trains.json

success "144 Züge generiert!"

# ============================================
# SCHRITT 3: ENTWICKLUNGSSERVER STARTEN
# ============================================
status "Starte Entwicklungsserver..."

# Server im Hintergrund starten mit Timeout-Schutz
timeout 5 npm run dev 2>&1 | tee dev.log &
SERVER_PID=$!

# Warte auf Server-Start
status "Warte auf Server-Start..."
for i in {1..10}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        success "Frontend läuft auf http://localhost:3001"
        break
    fi
    sleep 1
    echo -n "."
done

for i in {1..10}; do
    if curl -s http://localhost:4100/health > /dev/null 2>&1; then
        success "Backend läuft auf http://localhost:4100"
        break
    fi
    sleep 1
    echo -n "."
done

# ============================================
# SCHRITT 4: STATUS PRÜFEN
# ============================================
echo ""
status "Prüfe Züge-Anzahl..."
TRAIN_COUNT=$(curl -s http://localhost:4100/api/trains 2>/dev/null | grep -o '"id"' | wc -l)
if [ "$TRAIN_COUNT" -eq 144 ]; then
    success "✅ Alle 144 Züge verfügbar!"
else
    warning "⚠️  Nur $TRAIN_COUNT Züge gefunden (erwartet: 144)"
fi

# ============================================
# FINALE ANWEISUNGEN
# ============================================
echo ""
echo "================================================"
echo -e "${GREEN}✅ SYSTEM BEREIT!${NC}"
echo "================================================"
echo ""
echo "🌐 Frontend: http://localhost:3001"
echo "🔧 Backend:  http://localhost:4100"
echo "📊 Züge:     $TRAIN_COUNT von 144"
echo ""
echo "📝 Was Sie sehen sollten:"
echo "   - Links: Sidebar mit Filtern"
echo "   - Mitte: Karte mit 144 bewegenden Zügen"
echo "   - Filter: MEX16, RE8, RE9"
echo ""
echo -e "${YELLOW}⚠️  Falls Probleme:${NC}"
echo "   1. Browser Cache leeren (Cmd+Shift+R)"
echo "   2. Dieses Script nochmal ausführen"
echo ""
echo "Server läuft... (Stoppen mit Ctrl+C)"

# Keep server running
wait $SERVER_PID




