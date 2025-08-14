#!/bin/bash

# Quick Push Script für automatische GitHub-Synchronisation
# Verwendung: ./scripts/quick-push.sh "Commit Message"

if [ -z "$1" ]; then
    echo "❌ Bitte Commit-Message angeben!"
    echo "Verwendung: ./scripts/quick-push.sh \"Ihre Commit Message\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "🚀 Quick Push gestartet..."
echo "📝 Commit Message: $COMMIT_MESSAGE"

# Status anzeigen
echo "📊 Git Status:"
git status --short

# Alle Änderungen hinzufügen
echo "➕ Änderungen stagen..."
git add .

# Committen
echo "💾 Committen..."
git commit -m "$COMMIT_MESSAGE"

# Zu GitHub pushen
echo "📤 Zu GitHub pushen..."
git push origin main

echo "✅ Quick Push abgeschlossen!"
echo "🌐 Änderungen sind jetzt auf GitHub sichtbar:"
echo "   https://github.com/christianschmeing/eucorail-fleetops-demo"
