#!/usr/bin/env node

// Generiere korrekte Zugdaten mit richtigen IDs
const fs = require('fs');
const path = require('path');

// Zug-Definitionen für jede Linie
const trainDefinitions = {
  RE9: {
    prefix: 'RE9-78',
    count: 40,
    region: 'BY',
    line: 'RE9',
    depot: 'Augsburg',
    manufacturer: 'siemens',
    series: 'Mireo'
  },
  MEX16: {
    prefix: 'MEX16-66',
    count: 35,
    region: 'BW',
    line: 'MEX16',
    depot: 'Stuttgart',
    manufacturer: 'stadler',
    series: 'FLIRT³'
  },
  RE8: {
    prefix: 'RE8-79',
    count: 35,
    region: 'BW',
    line: 'RE8',
    depot: 'Stuttgart',
    manufacturer: 'stadler',
    series: 'FLIRT³'
  }
};

// Weitere Linien für mehr Vielfalt
const additionalLines = {
  RE1: { prefix: 'RE1-70', count: 10, region: 'BW', line: 'RE1', depot: 'Mannheim' },
  RE72: { prefix: 'RE72-72', count: 8, region: 'BY', line: 'RE72', depot: 'München' },
  RE80: { prefix: 'RE80-80', count: 7, region: 'BW', line: 'RE80', depot: 'Karlsruhe' },
  RE90: { prefix: 'RE90-90', count: 6, region: 'BY', line: 'RE90', depot: 'Nürnberg' },
  RE96: { prefix: 'RE96-96', count: 5, region: 'BY', line: 'RE96', depot: 'Regensburg' }
};

const allDefinitions = { ...trainDefinitions, ...additionalLines };

// Status-Verteilung (realistisch)
const statusDistribution = [
  { status: 'active', weight: 70 },
  { status: 'standby', weight: 15 },
  { status: 'maintenance', weight: 10 },
  { status: 'inspection', weight: 5 }
];

function getRandomStatus() {
  const rand = Math.random() * 100;
  let accumulated = 0;
  for (const { status, weight } of statusDistribution) {
    accumulated += weight;
    if (rand < accumulated) return status;
  }
  return 'active';
}

// Generiere Züge
const trains = [];
let globalId = 1;

for (const [lineKey, config] of Object.entries(allDefinitions)) {
  for (let i = 1; i <= config.count; i++) {
    const id = `${config.prefix}${String(i).padStart(3, '0')}`;
    const fleetId = `averio-${config.region.toLowerCase()}`;
    
    trains.push({
      id,
      fleetId,
      lineId: config.line,
      manufacturerId: config.manufacturer || 'siemens',
      typeKey: config.series === 'FLIRT³' ? 'flirt3-3' : 'mireo-3',
      series: config.series || 'Mireo',
      buildYear: 2019 + Math.floor(Math.random() * 5),
      depot: config.depot,
      status: getRandomStatus(),
      lastSeen: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      meta: {
        formation: '3-car',
        etcsPrepared: true,
        kmTotal: Math.floor(Math.random() * 500000) + 100000,
        lastMaintenance: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString()
      }
    });
  }
}

// Schreibe Datei
const outputPath = path.join(__dirname, '..', 'seeds', 'averio', 'trains.json');
fs.writeFileSync(outputPath, JSON.stringify(trains, null, 2));

console.log(`✅ Generiert: ${trains.length} Züge`);
console.log(`   - RE9: ${trainDefinitions.RE9.count} Züge`);
console.log(`   - MEX16: ${trainDefinitions.MEX16.count} Züge`);
console.log(`   - RE8: ${trainDefinitions.RE8.count} Züge`);
console.log(`   - Weitere: ${Object.values(additionalLines).reduce((sum, l) => sum + l.count, 0)} Züge`);
console.log(`📁 Gespeichert in: ${outputPath}`);
