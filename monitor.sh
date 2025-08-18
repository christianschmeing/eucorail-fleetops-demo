#!/bin/bash

# ============================================
# ECHTZEIT STATUS-MONITOR
# ============================================

clear
while true; do
    echo "================================================"
    echo "     🚂 EUCORAIL FLEETOPS - STATUS MONITOR"
    echo "================================================"
    echo ""
    
    # Server Status
    echo "📡 SERVER STATUS:"
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "   ✅ Frontend: ONLINE (Port 3001)"
    else
        echo "   ❌ Frontend: OFFLINE"
    fi
    
    if curl -s http://localhost:4100/health > /dev/null 2>&1; then
        echo "   ✅ Backend:  ONLINE (Port 4100)"
    else
        echo "   ❌ Backend:  OFFLINE"
    fi
    echo ""
    
    # Züge Status
    echo "🚆 ZÜGE STATUS:"
    TRAINS=$(curl -s http://localhost:4100/api/trains 2>/dev/null)
    if [ ! -z "$TRAINS" ]; then
        TOTAL=$(echo "$TRAINS" | grep -o '"id"' | wc -l)
        MEX16=$(echo "$TRAINS" | grep -o '"MEX16-' | wc -l)
        RE8=$(echo "$TRAINS" | grep -o '"RE8-' | wc -l)
        RE9=$(echo "$TRAINS" | grep -o '"RE9-' | wc -l)
        
        echo "   📊 Gesamt: $TOTAL Züge"
        echo "   • MEX16: $MEX16 Züge"
        echo "   • RE8:   $RE8 Züge"
        echo "   • RE9:   $RE9 Züge"
    else
        echo "   ⚠️  Keine Daten verfügbar"
    fi
    echo ""
    
    # Prozesse
    echo "⚙️  AKTIVE PROZESSE:"
    NEXT_PID=$(pgrep -f "next dev" | head -1)
    TSX_PID=$(pgrep -f "tsx watch" | head -1)
    
    if [ ! -z "$NEXT_PID" ]; then
        echo "   • Next.js:  PID $NEXT_PID"
    else
        echo "   • Next.js:  Nicht aktiv"
    fi
    
    if [ ! -z "$TSX_PID" ]; then
        echo "   • API:      PID $TSX_PID"
    else
        echo "   • API:      Nicht aktiv"
    fi
    echo ""
    
    # URLs
    echo "🔗 ZUGRIFF:"
    echo "   Frontend: http://localhost:3001"
    echo "   Backend:  http://localhost:4100"
    echo ""
    
    echo "================================================"
    echo "Aktualisierung in 3 Sekunden... (Ctrl+C zum Beenden)"
    sleep 3
    clear
done


