#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Generate all 144 trains with correct IDs
const trains = [];

// MEX16 trains (66 total: MEX16-66001 to MEX16-66066)
for (let i = 1; i <= 66; i++) {
  const id = `MEX16-66${String(i).padStart(3, '0')}`;
  trains.push({
    id: id,
    name: id,
    line: "MEX16",
    lineId: "MEX16",
    fleetId: Math.random() > 0.5 ? "flirt3-3" : "mireo-3",
    depot: Math.random() > 0.5 ? "München" : "Augsburg",
    status: ["active", "standby", "maintenance"][Math.floor(Math.random() * 3)],
    position: {
      lat: 48.1351 + (Math.random() - 0.5) * 2,
      lng: 11.5820 + (Math.random() - 0.5) * 2
    },
    speed: Math.floor(Math.random() * 160),
    direction: Math.floor(Math.random() * 360),
    delay: Math.floor(Math.random() * 10) - 5,
    nextStop: ["München Hbf", "Augsburg Hbf", "Ingolstadt", "Nürnberg"][Math.floor(Math.random() * 4)],
    occupancy: Math.floor(Math.random() * 100),
    temperature: 20 + Math.floor(Math.random() * 10),
    healthScore: 85 + Math.floor(Math.random() * 15)
  });
}

// RE8 trains (39 total: RE8-79001 to RE8-79039)
for (let i = 1; i <= 39; i++) {
  const id = `RE8-79${String(i).padStart(3, '0')}`;
  trains.push({
    id: id,
    name: id,
    line: "RE8",
    lineId: "RE8",
    fleetId: Math.random() > 0.5 ? "talent2" : "flirt3-3",
    depot: Math.random() > 0.5 ? "Stuttgart" : "Karlsruhe",
    status: ["active", "standby", "maintenance"][Math.floor(Math.random() * 3)],
    position: {
      lat: 48.7758 + (Math.random() - 0.5) * 2,
      lng: 9.1829 + (Math.random() - 0.5) * 2
    },
    speed: Math.floor(Math.random() * 140),
    direction: Math.floor(Math.random() * 360),
    delay: Math.floor(Math.random() * 10) - 5,
    nextStop: ["Stuttgart Hbf", "Karlsruhe Hbf", "Mannheim", "Ulm"][Math.floor(Math.random() * 4)],
    occupancy: Math.floor(Math.random() * 100),
    temperature: 20 + Math.floor(Math.random() * 10),
    healthScore: 85 + Math.floor(Math.random() * 15)
  });
}

// RE9 trains (39 total: RE9-78001 to RE9-78039)
for (let i = 1; i <= 39; i++) {
  const id = `RE9-78${String(i).padStart(3, '0')}`;
  trains.push({
    id: id,
    name: id,
    line: "RE9",
    lineId: "RE9",
    fleetId: Math.random() > 0.5 ? "talent2" : "mireo-3",
    depot: Math.random() > 0.5 ? "Stuttgart" : "Karlsruhe",
    status: ["active", "standby", "maintenance"][Math.floor(Math.random() * 3)],
    position: {
      lat: 48.7758 + (Math.random() - 0.5) * 2,
      lng: 9.1829 + (Math.random() - 0.5) * 2
    },
    speed: Math.floor(Math.random() * 140),
    direction: Math.floor(Math.random() * 360),
    delay: Math.floor(Math.random() * 10) - 5,
    nextStop: ["Stuttgart Hbf", "Karlsruhe Hbf", "Heilbronn", "Heidelberg"][Math.floor(Math.random() * 4)],
    occupancy: Math.floor(Math.random() * 100),
    temperature: 20 + Math.floor(Math.random() * 10),
    healthScore: 85 + Math.floor(Math.random() * 15)
  });
}

// Save to trains.json
const outputPath = path.join(process.cwd(), 'packages', 'api', 'seeds', 'averio', 'trains.json');
fs.writeFileSync(outputPath, JSON.stringify(trains, null, 2));

console.log(`✅ Generated ${trains.length} trains (66 MEX16 + 39 RE8 + 39 RE9 = 144 total)`);
console.log(`📁 Saved to: ${outputPath}`);
console.log('\nTrain distribution:');
console.log(`- MEX16: ${trains.filter(t => t.lineId === 'MEX16').length} trains`);
console.log(`- RE8: ${trains.filter(t => t.lineId === 'RE8').length} trains`);
console.log(`- RE9: ${trains.filter(t => t.lineId === 'RE9').length} trains`);
