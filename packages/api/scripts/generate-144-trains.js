#!/usr/bin/env node

/**
 * Generator für 144 Züge - Eucorail FleetOps
 * Zielverteilung:
 * - RE9 (Bayern): 40 Züge
 * - MEX16 (Baden-Württemberg): 35 Züge  
 * - RE8 (Baden-Württemberg): 35 Züge
 * - RE1 (Baden-Württemberg): 17 Züge
 * - RE89 (Bayern): 17 Züge
 * Total: 144 Züge
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konstanten für die Flotte
const FLEET_SIZE = 144;

// Regionale Verteilung (BW: 87, BY: 57)
const DISTRIBUTION = {
  'RE9': { count: 40, region: 'BY', depot: 'Augsburg', prefix: 'RE9-78', startNum: 1 },
  'MEX16': { count: 35, region: 'BW', depot: 'Stuttgart', prefix: 'MEX16-66', startNum: 1 },
  'RE8': { count: 35, region: 'BW', depot: 'Stuttgart', prefix: 'RE8-79', startNum: 1 },
  'RE1': { count: 17, region: 'BW', depot: 'Stuttgart', prefix: 'RE1-77', startNum: 1 },
  'RE89': { count: 17, region: 'BY', depot: 'Augsburg', prefix: 'RE89-78', startNum: 51 }
};

// Status-Verteilung (realistische Aufteilung)
const STATUS_DISTRIBUTION = {
  'active': 108,      // 75% - Im Einsatz
  'maintenance': 18,  // 12.5% - In Wartung
  'standby': 12,      // 8.3% - Bereitschaft
  'inspection': 6     // 4.2% - Inspektion
};

// Hersteller-Mapping
const MANUFACTURERS = {
  'RE9': { maker: 'siemens', type: 'mireo-3', series: 'Mireo' },
  'MEX16': { maker: 'stadler', type: 'flirt3-3', series: 'FLIRT³' },
  'RE8': { maker: 'stadler', type: 'flirt3-3', series: 'FLIRT³' },
  'RE1': { maker: 'stadler', type: 'flirt3-5', series: 'FLIRT³' },
  'RE89': { maker: 'siemens', type: 'mireo-3', series: 'Mireo' }
};

// Generiere Züge
function generateTrains() {
  const trains = [];
  const statusCounts = { active: 0, maintenance: 0, standby: 0, inspection: 0 };
  
  for (const [lineId, config] of Object.entries(DISTRIBUTION)) {
    const manufacturer = MANUFACTURERS[lineId];
    
    for (let i = 0; i < config.count; i++) {
      const trainNum = config.startNum + i;
      const id = `${config.prefix}${String(trainNum).padStart(3, '0')}`;
      
      // Status-Zuweisung basierend auf Verteilung
      let status = 'active';
      if (statusCounts.maintenance < STATUS_DISTRIBUTION.maintenance && i % 8 === 1) {
        status = 'maintenance';
        statusCounts.maintenance++;
      } else if (statusCounts.standby < STATUS_DISTRIBUTION.standby && i % 12 === 2) {
        status = 'standby';
        statusCounts.standby++;
      } else if (statusCounts.inspection < STATUS_DISTRIBUTION.inspection && i % 24 === 3) {
        status = 'inspection';
        statusCounts.inspection++;
      } else {
        statusCounts.active++;
      }
      
      // Baujahr-Verteilung (2020-2024)
      const buildYear = 2020 + Math.floor(i / (config.count / 5));
      
      const train = {
        id,
        fleetId: `averio-${config.region.toLowerCase()}`,
        lineId,
        manufacturerId: manufacturer.maker,
        typeKey: manufacturer.type,
        series: manufacturer.series,
        buildYear,
        depot: config.depot,
        status,
        lastSeen: new Date().toISOString(),
        meta: {
          formation: manufacturer.type.includes('-3') ? '3-car' : '5-car',
          etcsPrepared: true
        },
        // Zusätzliche Felder für bessere Datenqualität
        region: config.region,
        delayMin: status === 'active' ? Math.floor(Math.random() * 10) - 5 : 0,
        speedKmh: status === 'active' ? 80 + Math.floor(Math.random() * 40) : 0,
        healthScore: 85 + Math.floor(Math.random() * 15),
        mileageKm: 100000 + Math.floor(Math.random() * 500000),
        capacity: manufacturer.type.includes('-3') ? 180 : 300,
        nextMaintenanceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      // Position basierend auf Status
      if (status === 'active') {
        // Aktive Züge bekommen realistische Positionen auf ihren Linien
        const positions = {
          'RE9': { lat: 48.35 + Math.random() * 0.1, lng: 10.85 + Math.random() * 0.2 },
          'MEX16': { lat: 48.70 + Math.random() * 0.1, lng: 9.18 + Math.random() * 0.8 },
          'RE8': { lat: 48.78 + Math.random() * 1.0, lng: 9.18 + Math.random() * 0.8 },
          'RE1': { lat: 48.70 + Math.random() * 0.3, lng: 9.00 + Math.random() * 0.5 },
          'RE89': { lat: 48.14 + Math.random() * 0.2, lng: 11.56 + Math.random() * 0.4 }
        };
        train.position = positions[lineId];
      } else {
        // Nicht-aktive Züge sind im Depot
        const depotPositions = {
          'Stuttgart': { lat: 48.783, lng: 9.182 },
          'Augsburg': { lat: 48.365, lng: 10.885 }
        };
        train.position = depotPositions[config.depot];
      }
      
      trains.push(train);
    }
  }
  
  // Finale Status-Anpassung um genau die Zielverteilung zu erreichen
  let activeCount = trains.filter(t => t.status === 'active').length;
  while (activeCount < STATUS_DISTRIBUTION.active) {
    const train = trains.find(t => t.status !== 'active');
    if (train) {
      train.status = 'active';
      activeCount++;
    } else break;
  }
  
  return trains;
}

// Hauptfunktion
function main() {
  const trains = generateTrains();
  
  // Validierung
  console.log('=== Eucorail FleetOps 144-Züge Generator ===');
  console.log(`Generierte Züge: ${trains.length}`);
  console.log('\nVerteilung nach Linie:');
  for (const [lineId, config] of Object.entries(DISTRIBUTION)) {
    const count = trains.filter(t => t.lineId === lineId).length;
    console.log(`  ${lineId}: ${count} (Soll: ${config.count})`);
  }
  
  console.log('\nVerteilung nach Status:');
  const statusGroups = {};
  trains.forEach(t => {
    statusGroups[t.status] = (statusGroups[t.status] || 0) + 1;
  });
  Object.entries(statusGroups).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  console.log('\nVerteilung nach Region:');
  const bw = trains.filter(t => t.region === 'BW').length;
  const by = trains.filter(t => t.region === 'BY').length;
  console.log(`  Baden-Württemberg: ${bw}`);
  console.log(`  Bayern: ${by}`);
  
  // Speichere die Daten
  const outputPath = path.join(__dirname, '..', 'seeds', 'averio', 'trains-144.json');
  fs.writeFileSync(outputPath, JSON.stringify(trains, null, 2));
  console.log(`\n✅ Datei gespeichert: ${outputPath}`);
  
  // Erstelle auch eine kompakte fleet.json für die API
  const fleet = trains.map(t => ({
    runId: t.id,
    line: t.lineId,
    unitType: t.series.toUpperCase().replace(/[³\s]/g, ''),
    region: t.region,
    status: t.status
  }));
  
  const fleetPath = path.join(__dirname, '..', '..', '..', 'data', 'fleet-144.json');
  fs.mkdirSync(path.dirname(fleetPath), { recursive: true });
  fs.writeFileSync(fleetPath, JSON.stringify(fleet, null, 2));
  console.log(`✅ Fleet-Datei gespeichert: ${fleetPath}`);
  
  // Erstelle Linien-Aggregation
  const lines = [];
  for (const [lineId, config] of Object.entries(DISTRIBUTION)) {
    const lineTrains = trains.filter(t => t.lineId === lineId);
    const activeCount = lineTrains.filter(t => t.status === 'active').length;
    
    lines.push({
      id: lineId,
      name: `Linie ${lineId}`,
      region: config.region,
      operator: `Arverio ${config.region}`,
      depot: config.depot,
      vehicles: config.count,
      activeVehicles: activeCount,
      avgDelayMin: Math.round(Math.random() * 5 - 2),
      punctualityPct: 85 + Math.round(Math.random() * 10),
      utilizationPct: Math.round((activeCount / config.count) * 100)
    });
  }
  
  const linesPath = path.join(__dirname, '..', 'seeds', 'averio', 'lines-144.json');
  fs.writeFileSync(linesPath, JSON.stringify(lines, null, 2));
  console.log(`✅ Linien-Datei gespeichert: ${linesPath}`);
  
  console.log('\n=== Generierung abgeschlossen ===');
  console.log(`Gesamt: ${trains.length} Züge (SOLL: ${FLEET_SIZE})`);
  
  if (trains.length !== FLEET_SIZE) {
    console.error(`⚠️  WARNUNG: Generierte ${trains.length} statt ${FLEET_SIZE} Züge!`);
    process.exit(1);
  }
}

// Ausführung
main();
