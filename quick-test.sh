#!/bin/bash

# Quick Test mit automatischer Bereinigung
echo "🧹 Bereinige alte Prozesse..."
kill $(lsof -ti:3001,3002,4100,4101) 2>/dev/null || true
pkill -f playwright 2>/dev/null || true
pkill -f "npm run" 2>/dev/null || true
sleep 2

echo "🔨 Baue Projekt..."
npm run build:all

echo "🚀 Starte Test-Server..."
npm run dev:e2e &
SERVER_PID=$!

echo "⏳ Warte auf Server..."
sleep 10

echo "🧪 Führe Tests aus..."
npx playwright test tests/e2e/health.spec.ts tests/e2e/home.spec.ts tests/e2e/data-as-of.spec.ts

echo "🛑 Beende Server..."
kill $SERVER_PID 2>/dev/null || true

echo "✅ Fertig!"




