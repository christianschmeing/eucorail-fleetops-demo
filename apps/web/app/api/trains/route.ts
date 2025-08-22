import { NextResponse } from 'next/server';

import { ECM_PROFILES } from '@/lib/maintenance/ecm-profiles';

// Berechne Wartungsinformationen für einen Zug
function calculateMaintenanceInfo(
  vehicleType: string,
  mileageKm: number,
  _lastMaintenanceDates: any
) {
  const key = vehicleType.includes('flirt')
    ? 'FLIRT3'
    : vehicleType.includes('mireo')
      ? 'MIREO'
      : 'DESIRO_HC';
  const profile: any = (ECM_PROFILES as any)[key];
  if (!profile) return null;

  const now = new Date();
  const maintenanceInfo: any = {};

  ['IS1', 'IS2', 'IS3', 'IS4', 'Lathe'].forEach((type) => {
    const cfg = type === 'Lathe' ? profile.WHEEL_LATHE : profile[type];
    if (!cfg) return;

    const intervalKm = cfg.periodKm ?? 0;
    const intervalDays = cfg.periodDays ?? 365;

    const kmSinceLast = intervalKm > 0 ? mileageKm % intervalKm : 0;
    const restKm = Math.max(0, intervalKm - kmSinceLast);
    const daysSinceLast = intervalKm > 0 ? Math.floor(kmSinceLast / 500) : 0;
    const restDays = Math.max(0, intervalDays - daysSinceLast);

    let status: 'green' | 'yellow' | 'red' = 'green';
    const kmPercent = intervalKm > 0 ? (kmSinceLast / intervalKm) * 100 : 0;
    const daysPercent = (daysSinceLast / intervalDays) * 100;
    if (kmPercent > 90 || daysPercent > 90) status = 'red';
    else if (kmPercent > 75 || daysPercent > 75) status = 'yellow';

    maintenanceInfo[type] = {
      kmSinceLast,
      daysSinceLast,
      restKm,
      restDays,
      status,
      intervalKm,
      intervalDays,
      lastDate: new Date(now.getTime() - daysSinceLast * 24 * 60 * 60 * 1000).toISOString(),
      nextDate: new Date(now.getTime() + restDays * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  return maintenanceInfo;
}

// Import the SSOV2 data directly for 144 trains
const FLEET_DATA = {
  trains: Array.from({ length: 144 }, (_, i) => {
    const trainNum = i + 1;
    let lineCode, vehicleType, homeDepot, status, region;

    // Erste 59: FLIRT für BW
    if (trainNum <= 59) {
      const lineOptions = ['RE1', 'RE2', 'RE8', 'RB22', 'RB27'];
      lineCode = lineOptions[Math.floor(Math.random() * lineOptions.length)];
      vehicleType = 'flirt_3_160';
      homeDepot = 'Essingen';
      region = 'BW';
      status = trainNum <= 44 ? 'active' : trainNum <= 52 ? 'maintenance' : 'reserve';
    }
    // 60-108: Mireo für BY
    else if (trainNum <= 108) {
      const lineOptions = ['RE9', 'RE12', 'MEX16', 'MEX18', 'MEX12', 'RB32', 'RB54'];
      lineCode = lineOptions[Math.floor(Math.random() * lineOptions.length)];
      vehicleType = 'mireo_3_plus_h';
      homeDepot = 'Langweid';
      region = 'BY';
      status = trainNum <= 90 ? 'active' : trainNum <= 100 ? 'maintenance' : 'reserve';
    }
    // 109-144: restliche FLIRT3 BY-Netze (Averio-Set, keine S-Bahn)
    else {
      // Use Averio BY lines only to match Averio fleet scope
      const lineOptions = ['RE9', 'RE12', 'MEX16', 'MEX18', 'MEX12', 'RB32', 'RB54'];
      lineCode = lineOptions[Math.floor(Math.random() * lineOptions.length)];
      vehicleType = 'flirt_3_160';
      homeDepot = 'Langweid';
      region = 'BY';
      // Adjust boundaries to yield exactly 22 reserves across fleet (C8 SSOT)
      status = trainNum <= 130 ? 'active' : trainNum <= 137 ? 'maintenance' : 'reserve';
    }

    // Reserve-Züge behalten ihre ursprüngliche Linienzuordnung (keine S‑Bahn/Reserve-Linie)
    const isReserve = status === 'reserve';

    const trainId = `${lineCode}-${60000 + trainNum}`;

    return {
      id: trainId,
      trainId,
      slot: `SL-${trainNum}`,
      uic: `DE${100000 + trainNum}`,
      manufacturer: vehicleType.startsWith('flirt') ? 'Stadler' : 'Siemens',
      series: vehicleType.startsWith('flirt')
        ? 'FLIRT 3'
        : vehicleType.includes('mireo')
          ? 'Mireo Plus H'
          : 'Desiro HC',
      model: vehicleType.startsWith('flirt')
        ? 'FLIRT 3 160km/h'
        : vehicleType.includes('mireo')
          ? 'Mireo Plus H2'
          : 'Desiro HC 4-car',
      vehicleType,
      vehicleFamily: vehicleType.startsWith('flirt')
        ? 'Stadler FLIRT'
        : vehicleType.includes('mireo')
          ? 'Siemens Mireo'
          : 'Siemens Desiro',
      lineId: lineCode,
      lineCode,
      line: lineCode,
      lineName: lineCode.startsWith('RE')
        ? `Regional-Express ${lineCode}`
        : lineCode.startsWith('MEX')
          ? `Metropol-Express ${lineCode}`
          : lineCode.startsWith('RB')
            ? `Regionalbahn ${lineCode}`
            : lineCode.startsWith('S')
              ? `S-Bahn ${lineCode}`
              : 'Reserve',
      status,
      depot: homeDepot,
      homeDepot,
      region,
      ecm: trainNum % 7 === 0 ? 'OVERDUE' : trainNum % 5 === 0 ? 'DUE_SOON' : 'OK',
      nextMeasure:
        trainNum % 4 === 0
          ? 'IS4'
          : trainNum % 3 === 0
            ? 'IS3'
            : trainNum % 2 === 0
              ? 'IS2'
              : 'IS1',
      nextMaintenanceType:
        trainNum % 4 === 0
          ? 'IS4'
          : trainNum % 3 === 0
            ? 'IS3'
            : trainNum % 2 === 0
              ? 'IS2'
              : 'IS1',
      nextMaintenanceName:
        trainNum % 4 === 0
          ? 'IS4‑Hauptuntersuchung'
          : trainNum % 3 === 0
            ? 'IS3‑Wartung'
            : trainNum % 2 === 0
              ? 'IS2‑Wartung'
              : 'IS1‑Prüfung',
      nextMaintenanceAt: new Date(Date.now() + (trainNum % 30) * 24 * 60 * 60 * 1000).toISOString(),
      isReserve,
      mileageKm: 50000 + trainNum * 1000,
      speedKmh: status === 'active' ? Math.floor(Math.random() * 160) : 0,
      delayMin: status === 'active' ? Math.floor(Math.random() * 10) - 2 : 0,
      occupancyPct: status === 'active' ? Math.floor(Math.random() * 100) : 0,
      socPct: 60 + Math.floor(Math.random() * 40),
      geo:
        status === 'active'
          ? {
              lat: 48.5 + Math.random() * 2,
              lng: 9 + Math.random() * 3,
            }
          : null,
      currentLocation:
        status === 'active'
          ? {
              lat: 48.5 + Math.random() * 2,
              lng: 9 + Math.random() * 3,
            }
          : null,
      lastSeenAt: new Date().toISOString(),
      notes: [],
      maintenanceInfo: calculateMaintenanceInfo(vehicleType, 50000 + trainNum * 1000, {}),
    };
  }),
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  const lineId = searchParams.get('lineId');
  const status = searchParams.get('status');

  let trains = [...FLEET_DATA.trains];

  // Apply filters
  if (lineId) {
    trains = trains.filter((t) => t.lineCode === lineId);
  }
  if (status) {
    trains = trains.filter((t) => t.status === status);
  }
  if (limit) {
    trains = trains.slice(0, parseInt(limit));
  }

  return NextResponse.json(trains, {
    headers: {
      'cache-control': 'no-store',
      'x-fleet-size': '144',
    },
  });
}
