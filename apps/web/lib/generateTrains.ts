// IHB Profile für Wartungsintervalle
const IHB_PROFILES = {
  flirt_3_160: {
    preventiveIntervals: {
      IS1: { intervalKm: 2000, intervalDays: 2, durationHours: 4, teamSize: 2 },
      IS2: { intervalKm: 10000, intervalDays: 30, durationHours: 8, teamSize: 4 },
      IS3: { intervalKm: 60000, intervalDays: 180, durationHours: 24, teamSize: 6 },
      IS4: { intervalKm: 240000, intervalDays: 720, durationHours: 72, teamSize: 8 },
      Lathe: { intervalKm: 120000, intervalDays: 365, durationHours: 48, teamSize: 4 },
    },
  },
  mireo_3_plus_h: {
    preventiveIntervals: {
      IS1: { intervalKm: 2500, intervalDays: 3, durationHours: 3, teamSize: 2 },
      IS2: { intervalKm: 12000, intervalDays: 35, durationHours: 6, teamSize: 3 },
      IS3: { intervalKm: 72000, intervalDays: 210, durationHours: 18, teamSize: 5 },
      IS4: { intervalKm: 288000, intervalDays: 840, durationHours: 60, teamSize: 8 },
      Lathe: { intervalKm: 150000, intervalDays: 450, durationHours: 36, teamSize: 3 },
    },
  },
  desiro_hc: {
    preventiveIntervals: {
      IS1: { intervalKm: 1500, intervalDays: 1, durationHours: 5, teamSize: 3 },
      IS2: { intervalKm: 8000, intervalDays: 25, durationHours: 10, teamSize: 4 },
      IS3: { intervalKm: 48000, intervalDays: 150, durationHours: 30, teamSize: 6 },
      IS4: { intervalKm: 192000, intervalDays: 600, durationHours: 96, teamSize: 10 },
      Lathe: { intervalKm: 100000, intervalDays: 300, durationHours: 60, teamSize: 5 },
    },
  },
};

// Berechne Wartungsinformationen für einen Zug
function calculateMaintenanceInfo(vehicleType: string, mileageKm: number) {
  const profile = IHB_PROFILES[vehicleType as keyof typeof IHB_PROFILES];
  if (!profile) return null;

  const now = new Date();
  const maintenanceInfo: any = {};

  ['IS1', 'IS2', 'IS3', 'IS4', 'Lathe'].forEach((type) => {
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
    let status = 'green' as 'green' | 'yellow' | 'red';
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
      nextDate: new Date(now.getTime() + restDays * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  return maintenanceInfo;
}

import linesData from '@/data/lines-complete.json';

type LatLng = { lat: number; lon?: number; lng?: number };

function indexLinesById(): Record<string, LatLng[]> {
  const map: Record<string, LatLng[]> = {};
  const groups: any[] = [
    ...((linesData as any).baden_wuerttemberg ?? []),
    ...((linesData as any).bayern ?? []),
  ];
  for (const g of groups) {
    if (g?.id && Array.isArray(g.stations)) {
      map[g.id] = g.stations as LatLng[];
    }
  }
  return map;
}

const LINES_BY_ID = indexLinesById();

function sampleOnLine(lineId: string): { lat: number; lng: number } {
  const stations = LINES_BY_ID[lineId] || LINES_BY_ID['RE9'] || [];
  if (!stations.length) return { lat: 48.5 + Math.random() * 2, lng: 9 + Math.random() * 3 };
  // wähle zufälliges Segment
  const idx = Math.max(
    0,
    Math.min(stations.length - 2, Math.floor(Math.random() * (stations.length - 1)))
  );
  const a = stations[idx];
  const b = stations[idx + 1];
  const t = Math.random();
  const lat = a.lat * (1 - t) + b.lat * t;
  const lngA = a.lng ?? a.lon ?? 0;
  const lngB = b.lng ?? b.lon ?? 0;
  const lng = lngA * (1 - t) + lngB * t;
  return { lat, lng };
}

export function generateTrains() {
  // Zielverteilung gemäß Arverio-Spezifikation
  const targetBW = 66; // FLIRT³
  const targetBY = 78; // 12 Desiro HC, 44 Mireo, 22 FLIRT³

  // Reserve-Ziele
  const reserveBW = 7; // 5–8
  const reserveBY = 8; // 6–10

  const trains: any[] = [];

  // BW – ausschließlich FLIRT auf RE1/RE8/MEX16
  const bwLines = ['RE1', 'RE8', 'MEX16'];
  for (let i = 0; i < targetBW; i++) {
    const isReserve = i >= targetBW - reserveBW;
    const status = isReserve ? 'reserve' : i % 9 === 0 ? 'maintenance' : 'active';
    const line = bwLines[i % bwLines.length];
    const idNum = 60000 + (i + 1);
    const geo = status === 'active' ? sampleOnLine(line) : null;
    const mileageKm = 70000 + i * 1200;
    const vehicleType = 'flirt_3_160';
    trains.push({
      id: isReserve ? `RES-E-${90000 + i + 1}` : `${line}-${idNum}`,
      trainId: isReserve ? `RES-E-${90000 + i + 1}` : `${line}-${idNum}`,
      lineId: isReserve ? 'RESERVE' : line,
      lineCode: isReserve ? 'RESERVE' : line,
      line: isReserve ? 'RESERVE' : line,
      lineName: isReserve ? 'Reserve' : `Regional-Express ${line}`,
      region: 'BW',
      homeDepot: 'Essingen',
      depot: 'Essingen',
      status,
      manufacturer: 'Stadler',
      series: 'FLIRT 3',
      model: 'FLIRT 3 160km/h',
      vehicleType,
      vehicleFamily: 'Stadler FLIRT',
      mileageKm,
      speedKmh: status === 'active' ? Math.floor(Math.random() * 160) : 0,
      delayMin: status === 'active' ? Math.floor(Math.random() * 10) - 2 : 0,
      occupancyPct: status === 'active' ? Math.floor(Math.random() * 100) : 0,
      socPct: 60 + Math.floor(Math.random() * 40),
      geo,
      currentLocation: geo,
      lastSeenAt: new Date().toISOString(),
      healthScore: 85 + Math.floor(Math.random() * 15),
      maintenanceInfo: calculateMaintenanceInfo(vehicleType, mileageKm),
    });
  }

  // BY – Mischung: 12 Desiro HC (RE9 bevorzugt), 44 Mireo (RE9/RE80), 22 FLIRT
  const byDesiro = 12;
  const byMireo = 44;
  const byFlirt = 22;
  const byLinesPrimary = ['RE9', 'RE80'];

  let idxGlobal = 0;
  const pushBY = (
    vehicleType: 'desiro_hc' | 'mireo_3_plus_h' | 'flirt_3_160',
    count: number,
    lineChooser: (i: number) => string
  ) => {
    for (let i = 0; i < count; i++, idxGlobal++) {
      const isReserve = idxGlobal >= targetBY - reserveBY;
      const status = isReserve ? 'reserve' : idxGlobal % 8 === 0 ? 'maintenance' : 'active';
      const line = lineChooser(i);
      const idNum = 60000 + targetBW + idxGlobal + 1;
      const geo = status === 'active' ? sampleOnLine(line) : null;
      const mileageKm = 60000 + idxGlobal * 900;
      const manufacturer =
        vehicleType === 'desiro_hc'
          ? 'Siemens'
          : vehicleType === 'mireo_3_plus_h'
            ? 'Siemens'
            : 'Stadler';
      const series =
        vehicleType === 'desiro_hc'
          ? 'Desiro HC'
          : vehicleType === 'mireo_3_plus_h'
            ? 'Mireo Plus H'
            : 'FLIRT 3';
      const model =
        vehicleType === 'desiro_hc'
          ? 'Desiro HC 4-car'
          : vehicleType === 'mireo_3_plus_h'
            ? 'Mireo Plus H2'
            : 'FLIRT 3 160km/h';
      trains.push({
        id: isReserve ? `RES-L-${90000 + targetBW + idxGlobal + 1}` : `${line}-${idNum}`,
        trainId: isReserve ? `RES-L-${90000 + targetBW + idxGlobal + 1}` : `${line}-${idNum}`,
        lineId: isReserve ? 'RESERVE' : line,
        lineCode: isReserve ? 'RESERVE' : line,
        line: isReserve ? 'RESERVE' : line,
        lineName: isReserve ? 'Reserve' : `Regional-Express ${line}`,
        region: 'BY',
        homeDepot: 'Langweid',
        depot: 'Langweid',
        status,
        manufacturer,
        series,
        model,
        vehicleType,
        vehicleFamily:
          manufacturer +
          (vehicleType === 'desiro_hc'
            ? ' Desiro'
            : ' ' + (vehicleType === 'mireo_3_plus_h' ? 'Mireo' : 'FLIRT')),
        mileageKm,
        speedKmh: status === 'active' ? Math.floor(Math.random() * 160) : 0,
        delayMin: status === 'active' ? Math.floor(Math.random() * 10) - 2 : 0,
        occupancyPct: status === 'active' ? Math.floor(Math.random() * 100) : 0,
        socPct: 60 + Math.floor(Math.random() * 40),
        geo,
        currentLocation: geo,
        lastSeenAt: new Date().toISOString(),
        healthScore: 85 + Math.floor(Math.random() * 15),
        maintenanceInfo: calculateMaintenanceInfo(vehicleType, mileageKm),
      });
    }
  };

  // Desiro HC primär auf RE9
  pushBY('desiro_hc', byDesiro, () => 'RE9');
  // Mireo flexibel RE9/RE80
  pushBY('mireo_3_plus_h', byMireo, (i) => byLinesPrimary[i % byLinesPrimary.length]);
  // FLIRT Rest
  pushBY('flirt_3_160', byFlirt, (i) => byLinesPrimary[i % byLinesPrimary.length]);

  return trains;
}
