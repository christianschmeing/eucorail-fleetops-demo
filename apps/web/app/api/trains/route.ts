import { NextResponse } from 'next/server';

// IHB Profile für Wartungsintervalle
const IHB_PROFILES = {
  flirt_3_160: {
    preventiveIntervals: {
      IS1: { intervalKm: 2000, intervalDays: 2, durationHours: 4, teamSize: 2 },
      IS2: { intervalKm: 10000, intervalDays: 30, durationHours: 8, teamSize: 4 },
      IS3: { intervalKm: 60000, intervalDays: 180, durationHours: 24, teamSize: 6 },
      IS4: { intervalKm: 240000, intervalDays: 720, durationHours: 72, teamSize: 8 },
      Lathe: { intervalKm: 120000, intervalDays: 365, durationHours: 48, teamSize: 4 }
    }
  },
  mireo_3_plus_h: {
    preventiveIntervals: {
      IS1: { intervalKm: 2500, intervalDays: 3, durationHours: 3, teamSize: 2 },
      IS2: { intervalKm: 12000, intervalDays: 35, durationHours: 6, teamSize: 3 },
      IS3: { intervalKm: 72000, intervalDays: 210, durationHours: 18, teamSize: 5 },
      IS4: { intervalKm: 288000, intervalDays: 840, durationHours: 60, teamSize: 8 },
      Lathe: { intervalKm: 150000, intervalDays: 450, durationHours: 36, teamSize: 3 }
    }
  },
  desiro_hc: {
    preventiveIntervals: {
      IS1: { intervalKm: 1500, intervalDays: 1, durationHours: 5, teamSize: 3 },
      IS2: { intervalKm: 8000, intervalDays: 25, durationHours: 10, teamSize: 4 },
      IS3: { intervalKm: 48000, intervalDays: 150, durationHours: 30, teamSize: 6 },
      IS4: { intervalKm: 192000, intervalDays: 600, durationHours: 96, teamSize: 10 },
      Lathe: { intervalKm: 100000, intervalDays: 300, durationHours: 60, teamSize: 5 }
    }
  }
};

// Berechne Wartungsinformationen für einen Zug
function calculateMaintenanceInfo(vehicleType: string, mileageKm: number, lastMaintenanceDates: any) {
  const profile = IHB_PROFILES[vehicleType as keyof typeof IHB_PROFILES];
  if (!profile) return null;

  const now = new Date();
  const maintenanceInfo: any = {};

  ['IS1', 'IS2', 'IS3', 'IS4', 'Lathe'].forEach(type => {
    const interval = profile.preventiveIntervals[type as keyof typeof profile.preventiveIntervals];
    if (!interval) return;

    // Simuliere letzte Wartung basierend auf Laufleistung
    const cyclesSinceLast = Math.floor(mileageKm / interval.intervalKm);
    const kmSinceLast = mileageKm % interval.intervalKm;
    const restKm = interval.intervalKm - kmSinceLast;
    
    // Berechne Tage seit letzter Wartung (simuliert)
    const daysSinceLast = Math.floor(kmSinceLast / 500); // Annahme: 500km/Tag im Schnitt
    const restDays = Math.max(0, interval.intervalDays - daysSinceLast);

    // Ampelstatus berechnen
    let status = 'green';
    const kmPercent = (kmSinceLast / interval.intervalKm) * 100;
    const daysPercent = (daysSinceLast / interval.intervalDays) * 100;
    
    if (kmPercent > 90 || daysPercent > 90) {
      status = 'red';
    } else if (kmPercent > 75 || daysPercent > 75) {
      status = 'yellow';
    }

    maintenanceInfo[type] = {
      kmSinceLast,
      daysSinceLast,
      restKm,
      restDays,
      status,
      intervalKm: interval.intervalKm,
      intervalDays: interval.intervalDays,
      lastDate: new Date(now.getTime() - daysSinceLast * 24 * 60 * 60 * 1000).toISOString(),
      nextDate: new Date(now.getTime() + restDays * 24 * 60 * 60 * 1000).toISOString()
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
    // 109-144: Desiro für S-Bahn
    else {
      const lineOptions = ['S2', 'S3', 'S4', 'S6'];
      lineCode = lineOptions[Math.floor(Math.random() * lineOptions.length)];
      vehicleType = 'desiro_hc';
      homeDepot = 'Langweid';
      region = 'BY';
      status = trainNum <= 130 ? 'active' : trainNum <= 138 ? 'maintenance' : 'reserve';
    }
    
    // Reserve-Züge
    const isReserve = status === 'reserve';
    if (isReserve) {
      lineCode = 'RESERVE';
    }
    
    const trainId = isReserve 
      ? `RES-${homeDepot.charAt(0)}-${90000 + trainNum}`
      : `${lineCode}-${60000 + trainNum}`;
    
    return {
      id: trainId,
      trainId,
      slot: `SL-${trainNum}`,
      uic: `DE${100000 + trainNum}`,
      manufacturer: vehicleType.startsWith('flirt') ? 'Stadler' : 'Siemens',
      series: vehicleType.startsWith('flirt') ? 'FLIRT 3' : 
              vehicleType.includes('mireo') ? 'Mireo Plus H' : 'Desiro HC',
      model: vehicleType.startsWith('flirt') ? 'FLIRT 3 160km/h' : 
             vehicleType.includes('mireo') ? 'Mireo Plus H2' : 'Desiro HC 4-car',
      vehicleType,
      vehicleFamily: vehicleType.startsWith('flirt') ? 'Stadler FLIRT' : 
                     vehicleType.includes('mireo') ? 'Siemens Mireo' : 'Siemens Desiro',
      lineId: lineCode,
      lineCode,
      line: lineCode,
      lineName: lineCode.startsWith('RE') ? `Regional-Express ${lineCode}` :
                lineCode.startsWith('MEX') ? `Metropol-Express ${lineCode}` :
                lineCode.startsWith('RB') ? `Regionalbahn ${lineCode}` :
                lineCode.startsWith('S') ? `S-Bahn ${lineCode}` : 'Reserve',
      status,
      depot: homeDepot,
      homeDepot,
      region,
      ecm: trainNum % 7 === 0 ? 'OVERDUE' : trainNum % 5 === 0 ? 'DUE_SOON' : 'OK',
      nextMeasure: trainNum % 4 === 0 ? 'IS4' : trainNum % 3 === 0 ? 'IS3' : trainNum % 2 === 0 ? 'IS2' : 'IS1',
      nextMaintenanceType: trainNum % 4 === 0 ? 'IS4' : trainNum % 3 === 0 ? 'IS3' : trainNum % 2 === 0 ? 'IS2' : 'IS1',
      nextMaintenanceName: trainNum % 4 === 0 ? 'Hauptuntersuchung' : 
                           trainNum % 3 === 0 ? 'Quartalswartung' : 
                           trainNum % 2 === 0 ? 'Monatswartung' : 'Tägliche Prüfung',
      nextMaintenanceAt: new Date(Date.now() + (trainNum % 30) * 24 * 60 * 60 * 1000).toISOString(),
      isReserve,
      mileageKm: 50000 + (trainNum * 1000),
      speedKmh: status === 'active' ? Math.floor(Math.random() * 160) : 0,
      delayMin: status === 'active' ? Math.floor(Math.random() * 10) - 2 : 0,
      occupancyPct: status === 'active' ? Math.floor(Math.random() * 100) : 0,
      socPct: 60 + Math.floor(Math.random() * 40),
      geo: status === 'active' ? {
        lat: 48.5 + Math.random() * 2,
        lng: 9 + Math.random() * 3
      } : null,
      currentLocation: status === 'active' ? {
        lat: 48.5 + Math.random() * 2,
        lng: 9 + Math.random() * 3
      } : null,
      lastSeenAt: new Date().toISOString(),
      notes: [],
      maintenanceInfo: calculateMaintenanceInfo(vehicleType, 50000 + (trainNum * 1000), {})
    };
  })
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  const lineId = searchParams.get('lineId');
  const status = searchParams.get('status');
  
  let trains = [...FLEET_DATA.trains];
  
  // Apply filters
  if (lineId) {
    trains = trains.filter(t => t.lineCode === lineId);
  }
  if (status) {
    trains = trains.filter(t => t.status === status);
  }
  if (limit) {
    trains = trains.slice(0, parseInt(limit));
  }
  
  return NextResponse.json(trains, { 
    headers: { 
      'cache-control': 'no-store',
      'x-fleet-size': '144'
    } 
  });
}