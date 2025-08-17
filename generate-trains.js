// STABILES Script zur Generierung von 144 Zügen
// OHNE Shell-Commands, nur Node.js

const fs = require('fs');
const path = require('path');

console.log('🚂 Generiere 144 Züge...');

const trains = [];

// MEX16: 66 Züge (MEX16-66001 bis MEX16-66066)
for (let i = 1; i <= 66; i++) {
  const id = `MEX16-66${String(i).padStart(3, '0')}`;
  trains.push({
    id: id,
    lineId: "MEX16",
    line: "MEX16",
    name: id,
    fleetId: i % 2 === 0 ? "flirt3-3" : "mireo-3",
    manufacturerId: i % 2 === 0 ? "stadler" : "siemens",
    typeKey: i % 2 === 0 ? "flirt3-3" : "mireo-3",
    series: i % 2 === 0 ? "FLIRT³" : "Mireo",
    buildYear: 2020 + (i % 3),
    depot: i % 2 === 0 ? "München" : "Augsburg",
    status: ["active", "standby", "maintenance"][i % 3],
    lastSeen: new Date().toISOString(),
    position: {
      lat: 48.1351 + (Math.random() - 0.5) * 2,
      lng: 11.5820 + (Math.random() - 0.5) * 2
    },
    speed: Math.floor(Math.random() * 160),
    direction: Math.floor(Math.random() * 360),
    delay: Math.floor(Math.random() * 10) - 5,
    nextStop: ["München Hbf", "Augsburg Hbf", "Ingolstadt", "Nürnberg"][i % 4],
    occupancy: Math.floor(Math.random() * 100),
    temperature: 20 + Math.floor(Math.random() * 10),
    healthScore: 85 + Math.floor(Math.random() * 15),
    meta: {
      formation: "3-car",
      etcsPrepared: true
    }
  });
}

// RE8: 39 Züge (RE8-79001 bis RE8-79039)
for (let i = 1; i <= 39; i++) {
  const id = `RE8-79${String(i).padStart(3, '0')}`;
  trains.push({
    id: id,
    lineId: "RE8",
    line: "RE8",
    name: id,
    fleetId: i % 2 === 0 ? "talent2" : "flirt3-3",
    manufacturerId: i % 2 === 0 ? "bombardier" : "stadler",
    typeKey: i % 2 === 0 ? "talent2" : "flirt3-3",
    series: i % 2 === 0 ? "Talent 2" : "FLIRT³",
    buildYear: 2020 + (i % 3),
    depot: i % 2 === 0 ? "Stuttgart" : "Karlsruhe",
    status: ["active", "standby", "maintenance"][i % 3],
    lastSeen: new Date().toISOString(),
    position: {
      lat: 48.7758 + (Math.random() - 0.5) * 2,
      lng: 9.1829 + (Math.random() - 0.5) * 2
    },
    speed: Math.floor(Math.random() * 140),
    direction: Math.floor(Math.random() * 360),
    delay: Math.floor(Math.random() * 10) - 5,
    nextStop: ["Stuttgart Hbf", "Karlsruhe Hbf", "Mannheim", "Ulm"][i % 4],
    occupancy: Math.floor(Math.random() * 100),
    temperature: 20 + Math.floor(Math.random() * 10),
    healthScore: 85 + Math.floor(Math.random() * 15),
    meta: {
      formation: "3-car",
      etcsPrepared: true
    }
  });
}

// RE9: 39 Züge (RE9-78001 bis RE9-78039)
for (let i = 1; i <= 39; i++) {
  const id = `RE9-78${String(i).padStart(3, '0')}`;
  trains.push({
    id: id,
    lineId: "RE9",
    line: "RE9",
    name: id,
    fleetId: i % 2 === 0 ? "talent2" : "mireo-3",
    manufacturerId: i % 2 === 0 ? "bombardier" : "siemens",
    typeKey: i % 2 === 0 ? "talent2" : "mireo-3",
    series: i % 2 === 0 ? "Talent 2" : "Mireo",
    buildYear: 2020 + (i % 3),
    depot: i % 2 === 0 ? "Stuttgart" : "Karlsruhe",
    status: ["active", "standby", "maintenance"][i % 3],
    lastSeen: new Date().toISOString(),
    position: {
      lat: 48.7758 + (Math.random() - 0.5) * 2,
      lng: 9.1829 + (Math.random() - 0.5) * 2
    },
    speed: Math.floor(Math.random() * 140),
    direction: Math.floor(Math.random() * 360),
    delay: Math.floor(Math.random() * 10) - 5,
    nextStop: ["Stuttgart Hbf", "Karlsruhe Hbf", "Heilbronn", "Heidelberg"][i % 4],
    occupancy: Math.floor(Math.random() * 100),
    temperature: 20 + Math.floor(Math.random() * 10),
    healthScore: 85 + Math.floor(Math.random() * 15),
    meta: {
      formation: "3-car",
      etcsPrepared: true
    }
  });
}

// Speichern
const outputPath = path.join(__dirname, 'packages', 'api', 'seeds', 'averio', 'trains.json');
fs.writeFileSync(outputPath, JSON.stringify(trains, null, 2));

// Status ausgeben
console.log('✅ 144 Züge erfolgreich generiert!');
console.log(`📁 Gespeichert in: ${outputPath}`);
console.log('');
console.log('📊 Verteilung:');
console.log(`   • MEX16: ${trains.filter(t => t.lineId === 'MEX16').length} Züge`);
console.log(`   • RE8:   ${trains.filter(t => t.lineId === 'RE8').length} Züge`);
console.log(`   • RE9:   ${trains.filter(t => t.lineId === 'RE9').length} Züge`);
console.log(`   • TOTAL: ${trains.length} Züge`);
console.log('');
console.log('🔄 Server muss NEUGESTARTET werden!');
console.log('   1. Stoppen Sie den Server (Ctrl+C)');
console.log('   2. Starten Sie neu: npm run dev');
console.log('   3. Browser neu laden (Cmd+R)');
