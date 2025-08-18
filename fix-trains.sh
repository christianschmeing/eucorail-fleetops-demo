#!/bin/bash

cat > packages/api/seeds/averio/trains.json << 'EOF'
[
EOF

# MEX16 trains (66 total)
for i in {1..66}; do
  id=$(printf "MEX16-66%03d" $i)
  if [ $i -ne 1 ]; then echo "," >> packages/api/seeds/averio/trains.json; fi
  cat >> packages/api/seeds/averio/trains.json << EOF
  {"id":"$id","lineId":"MEX16","line":"MEX16","name":"$id","status":"active","position":{"lat":$((48 + RANDOM % 2)).$((RANDOM % 999)),"lng":$((11 + RANDOM % 2)).$((RANDOM % 999))},"speed":$((60 + RANDOM % 100)),"depot":"München","fleetId":"flirt3-3"}
EOF
done

# RE8 trains (39 total)
for i in {1..39}; do
  id=$(printf "RE8-79%03d" $i)
  echo "," >> packages/api/seeds/averio/trains.json
  cat >> packages/api/seeds/averio/trains.json << EOF
  {"id":"$id","lineId":"RE8","line":"RE8","name":"$id","status":"active","position":{"lat":$((48 + RANDOM % 2)).$((RANDOM % 999)),"lng":$((9 + RANDOM % 2)).$((RANDOM % 999))},"speed":$((60 + RANDOM % 100)),"depot":"Stuttgart","fleetId":"talent2"}
EOF
done

# RE9 trains (39 total)
for i in {1..39}; do
  id=$(printf "RE9-78%03d" $i)
  echo "," >> packages/api/seeds/averio/trains.json
  cat >> packages/api/seeds/averio/trains.json << EOF
  {"id":"$id","lineId":"RE9","line":"RE9","name":"$id","status":"active","position":{"lat":$((48 + RANDOM % 2)).$((RANDOM % 999)),"lng":$((9 + RANDOM % 2)).$((RANDOM % 999))},"speed":$((60 + RANDOM % 100)),"depot":"Stuttgart","fleetId":"talent2"}
EOF
done

echo "]" >> packages/api/seeds/averio/trains.json

echo "✅ Generated 144 trains (66 MEX16 + 39 RE8 + 39 RE9)"
echo "🔄 Restarting server..."

# Kill old processes
lsof -ti:3001,4100 | xargs kill -9 2>/dev/null || true
sleep 2

# Start server
npm run dev &
sleep 5

echo "✅ Server restarted!"
echo "🌐 Open http://localhost:3001 in your browser"


