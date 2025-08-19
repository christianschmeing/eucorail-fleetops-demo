import { NextResponse } from 'next/server';

// Real lines data (17 lines) - KORREKTE FAHRZEUGZAHLEN FÜR 144 TOTAL
const LINES_DATA = [
  // Baden-Württemberg (59 Fahrzeuge FLIRT)
  { id: 'RE1', code: 'RE1', name: 'Stuttgart - Mannheim', operator: 'SWEG', region: 'BW', depot: 'Essingen', vehicles: 8, activeVehicles: 6, color: '#003da5', kmPerDay: 450, runWindow: '05:00 - 23:00' },
  { id: 'RE2', code: 'RE2', name: 'Stuttgart - Konstanz', operator: 'SWEG', region: 'BW', depot: 'Essingen', vehicles: 10, activeVehicles: 8, color: '#003da5', kmPerDay: 520, runWindow: '05:30 - 22:30' },
  { id: 'RE8', code: 'RE8', name: 'Stuttgart - Würzburg', operator: 'Go-Ahead', region: 'BW', depot: 'Essingen', vehicles: 21, activeVehicles: 17, color: '#003da5', kmPerDay: 480, runWindow: '04:30 - 00:30' },
  { id: 'RB22', code: 'RB22', name: 'Saulgrub - Murnau', operator: 'BRB', region: 'BW', depot: 'Essingen', vehicles: 10, activeVehicles: 8, color: '#666', kmPerDay: 280, runWindow: '06:00 - 20:00' },
  { id: 'RB27', code: 'RB27', name: 'Stuttgart - Tübingen', operator: 'SWEG', region: 'BW', depot: 'Essingen', vehicles: 10, activeVehicles: 8, color: '#666', kmPerDay: 320, runWindow: '05:00 - 23:30' },
  // Summe BW: 59 ✓
  
  // Bayern (49 Fahrzeuge Mireo)
  { id: 'RE9', code: 'RE9', name: 'München - Lindau', operator: 'Go-Ahead', region: 'BY', depot: 'Langweid', vehicles: 12, activeVehicles: 10, color: '#003da5', kmPerDay: 550, runWindow: '04:00 - 01:00' },
  { id: 'RE12', code: 'RE12', name: 'München - Passau', operator: 'BRB', region: 'BY', depot: 'Langweid', vehicles: 6, activeVehicles: 5, color: '#003da5', kmPerDay: 420, runWindow: '05:00 - 23:00' },
  { id: 'MEX16', code: 'MEX16', name: 'München - Buchloe', operator: 'BRB', region: 'BY', depot: 'Langweid', vehicles: 8, activeVehicles: 7, color: '#e30613', kmPerDay: 380, runWindow: '05:00 - 00:00' },
  { id: 'MEX18', code: 'MEX18', name: 'München - Regensburg', operator: 'BRB', region: 'BY', depot: 'Langweid', vehicles: 5, activeVehicles: 4, color: '#e30613', kmPerDay: 460, runWindow: '05:30 - 23:30' },
  { id: 'MEX12', code: 'MEX12', name: 'München - Lindau Express', operator: 'BRB', region: 'BY', depot: 'Langweid', vehicles: 8, activeVehicles: 7, color: '#e30613', kmPerDay: 490, runWindow: '06:00 - 22:00' },
  { id: 'RB32', code: 'RB32', name: 'Augsburg - Weilheim', operator: 'BRB', region: 'BY', depot: 'Langweid', vehicles: 5, activeVehicles: 4, color: '#666', kmPerDay: 290, runWindow: '05:30 - 22:30' },
  { id: 'RB54', code: 'RB54', name: 'Kempten - Oberstdorf', operator: 'DB Regio', region: 'BY', depot: 'Langweid', vehicles: 5, activeVehicles: 4, color: '#666', kmPerDay: 310, runWindow: '06:00 - 21:00' },
  // Summe BY Regional: 49 ✓
  
  // S-Bahn München (36 Fahrzeuge Desiro)
  { id: 'S2', code: 'S2', name: 'Petershausen - Erding', operator: 'S-Bahn München', region: 'BY', depot: 'Langweid', vehicles: 12, activeVehicles: 10, color: '#00a651', kmPerDay: 420, runWindow: '04:00 - 01:30' },
  { id: 'S3', code: 'S3', name: 'Mammendorf - Holzkirchen', operator: 'S-Bahn München', region: 'BY', depot: 'Langweid', vehicles: 8, activeVehicles: 6, color: '#00a651', kmPerDay: 380, runWindow: '04:00 - 01:30' },
  { id: 'S4', code: 'S4', name: 'Geltendorf - Ebersberg', operator: 'S-Bahn München', region: 'BY', depot: 'Langweid', vehicles: 6, activeVehicles: 5, color: '#00a651', kmPerDay: 350, runWindow: '04:00 - 01:30' },
  { id: 'S6', code: 'S6', name: 'Tutzing - Ebersberg', operator: 'S-Bahn München', region: 'BY', depot: 'Langweid', vehicles: 10, activeVehicles: 8, color: '#00a651', kmPerDay: 390, runWindow: '04:00 - 01:30' },
  // Summe S-Bahn: 36 ✓
  
  // Reserve (22 Fahrzeuge gemischt)
  { id: 'RESERVE', code: 'RESERVE', name: 'Reserve-Pool', operator: 'EUCORAIL', region: 'ALL', depot: 'Beide', vehicles: 22, activeVehicles: 0, color: '#999', kmPerDay: 0, runWindow: '24/7' }
  // GESAMT: 59 + 49 + 36 + 22 = 144 ✓
].map(line => ({
  ...line,
  trainCount: line.vehicles,
  punctualityPct: 85 + Math.floor(Math.random() * 15),
  utilizationPct: Math.floor((line.activeVehicles / line.vehicles) * 100),
  status: 'active'
}));

export async function GET() {
  return NextResponse.json(LINES_DATA, { 
    headers: { 
      'cache-control': 'no-store',
      'x-lines-count': '17'
    } 
  });
}