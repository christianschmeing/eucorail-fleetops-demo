#!/bin/bash

# Sync from GitHub Script
# Verwendung: ./scripts/sync-from-github.sh

echo "🔄 Syncing from GitHub..."

# Aktuellen Branch speichern
CURRENT_BRANCH=$(git branch --show-current)

echo "📊 Current branch: $CURRENT_BRANCH"

# Änderungen von GitHub holen
echo "⬇️ Fetching latest changes from GitHub..."
git fetch origin

# Status anzeigen
echo "📋 Status:"
git status --short

# Prüfen ob es Updates gibt
if [ "$(git rev-list HEAD...origin/main --count)" != "0" ]; then
    echo "🆕 Updates available! Pulling changes..."
    git pull origin main
    
    echo "✅ Successfully synced from GitHub!"
    echo "📝 Recent commits:"
    git log --oneline -5
else
    echo "✅ Already up to date with GitHub!"
fi

echo "🌐 Repository: https://github.com/christianschmeing/eucorail-fleetops-demo"

