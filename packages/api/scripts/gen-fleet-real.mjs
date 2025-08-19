import fs from 'node:fs';
import path from 'node:path';

function pad(n, len = 3) {
  return String(n).padStart(len, '0');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function build() {
  const bwVehicles = [];
  // FLIRT 3-teilig (66001-66013)
  for (let i = 1; i <= 13; i++) {
    const runNumber = `66${pad(i)}`;
    bwVehicles.push({
      id: `train_${runNumber}`,
      runNumber,
      type: 'FLIRT³ 3-teilig',
      operator: 'Arverio BW',
      capacity: { first: 24, second: 156 },
      maxSpeed: 160,
      length: 58,
      manufacturingYear: 2019,
      lastMaintenance: '2024-11-15',
      nextMaintenance: '2025-02-15',
      mileage: randomInt(100000, 600000),
      status: i <= 3 ? 'depot_maintenance' : 'operational',
      features: ['wifi', 'ac', 'wheelchair', 'bike'],
      livery: 'bw_black_yellow',
      primaryLine: 'MEX16'
    });
  }
  // FLIRT 5-teilig (66014-66032)
  for (let i = 14; i <= 32; i++) {
    const runNumber = `66${pad(i)}`;
    bwVehicles.push({
      id: `train_${runNumber}`,
      runNumber,
      type: 'FLIRT³ 5-teilig',
      operator: 'Arverio BW',
      capacity: { first: 40, second: 260 },
      maxSpeed: 160,
      length: 97,
      manufacturingYear: 2020,
      lastMaintenance: '2024-12-10',
      nextMaintenance: '2025-03-10',
      mileage: randomInt(120000, 650000),
      status: i % 11 === 0 ? 'depot_maintenance' : 'operational',
      features: ['wifi', 'ac', 'wheelchair', 'bike'],
      livery: 'bw_black_yellow',
      primaryLine: i % 2 === 0 ? 'RE1' : 'RE8'
    });
  }

  const byVehicles = [];
  // Desiro HC (78001-78012)
  for (let i = 1; i <= 12; i++) {
    const runNumber = `78${pad(i)}`;
    byVehicles.push({
      id: `train_${runNumber}`,
      runNumber,
      type: 'Desiro HC',
      operator: 'Arverio BY',
      capacity: { first: 38, second: 500 },
      maxSpeed: 160,
      length: 105,
      manufacturingYear: 2021,
      lastMaintenance: '2024-12-05',
      nextMaintenance: '2025-03-05',
      mileage: randomInt(150000, 700000),
      status: i % 9 === 0 ? 'depot_maintenance' : 'operational',
      features: ['double_deck', 'high_capacity', 'coupling_compatible'],
      livery: 'by_white_blue',
      primaryLine: 'RE9'
    });
  }
  // Mireo (78013-78056)
  for (let i = 13; i <= 56; i++) {
    const runNumber = `78${pad(i)}`;
    byVehicles.push({
      id: `train_${runNumber}`,
      runNumber,
      type: 'Mireo',
      operator: 'Arverio BY',
      capacity: { first: 16, second: 200 },
      maxSpeed: 160,
      length: 69,
      manufacturingYear: 2022,
      lastMaintenance: '2024-10-22',
      nextMaintenance: '2025-01-22',
      mileage: randomInt(100000, 500000),
      status: i % 7 === 0 ? 'standby' : 'operational',
      features: ['lightweight', 'energy_efficient', 'coupling_compatible'],
      livery: 'by_white_blue',
      primaryLine: i % 2 === 0 ? 'RE9' : 'RE89'
    });
  }

  const out = {
    baden_wuerttemberg: {
      depot: {
        name: 'Wartungsstützpunkt Essingen',
        coordinates: [10.0155, 48.7114],
        capacity: 70
      },
      vehicles: bwVehicles
    },
    bayern: {
      depot: {
        name: 'Betriebswerk Langweid',
        coordinates: [10.8569, 48.4869],
        capacity: 85
      },
      vehicles: byVehicles
    }
  };

  const targetDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(targetDir, { recursive: true });
  const file = path.join(targetDir, 'fleet-real.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log('✅ Wrote', file, '\nBW:', bwVehicles.length, 'BY:', byVehicles.length, 'Total:', bwVehicles.length + byVehicles.length);
}

build();


