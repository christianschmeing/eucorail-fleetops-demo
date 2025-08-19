import { NextResponse } from 'next/server';

// IHB-Profile aus ihb_profiles.yaml (implementiert als Konstanten)
const IHB_PROFILES = {
  flirt_3_160: {
    preventiveIntervals: {
      IS1: { intervalKm: 2000, intervalDays: 1, durationHours: 2, teamSize: 2 },
      IS2: { intervalKm: 30000, intervalDays: 30, durationHours: 8, teamSize: 3 },
      IS3: { intervalKm: 90000, intervalDays: 90, durationHours: 24, teamSize: 4 },
      IS4: { intervalKm: 300000, intervalDays: 365, durationHours: 72, teamSize: 6 },
      lathe: { intervalKm: 150000, intervalDays: 0, durationHours: 8, teamSize: 2 },
      cleaning: { intervalKm: 0, intervalDays: 7, durationHours: 2, teamSize: 2 }
    }
  },
  mireo_3_plus_h: {
    preventiveIntervals: {
      IS1: { intervalKm: 2500, intervalDays: 1, durationHours: 2, teamSize: 2 },
      IS2: { intervalKm: 35000, intervalDays: 35, durationHours: 6, teamSize: 3 },
      IS3: { intervalKm: 100000, intervalDays: 100, durationHours: 20, teamSize: 4 },
      IS4: { intervalKm: 350000, intervalDays: 400, durationHours: 60, teamSize: 5 },
      lathe: { intervalKm: 180000, intervalDays: 0, durationHours: 10, teamSize: 2 },
      cleaning: { intervalKm: 0, intervalDays: 10, durationHours: 3, teamSize: 2 }
    }
  },
  desiro_hc: {
    preventiveIntervals: {
      IS1: { intervalKm: 1500, intervalDays: 1, durationHours: 1.5, teamSize: 2 },
      IS2: { intervalKm: 25000, intervalDays: 25, durationHours: 7, teamSize: 3 },
      IS3: { intervalKm: 80000, intervalDays: 80, durationHours: 18, teamSize: 4 },
      IS4: { intervalKm: 280000, intervalDays: 330, durationHours: 48, teamSize: 5 },
      lathe: { intervalKm: 120000, intervalDays: 0, durationHours: 6, teamSize: 2 },
      cleaning: { intervalKm: 0, intervalDays: 5, durationHours: 2.5, teamSize: 2 }
    }
  }
};

// Generate realistic work orders based on IHB profiles
function generateWorkOrders() {
  const workOrders = [];
  const statuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED'];
  const technicians = ['Schmidt, M.', 'Müller, K.', 'Weber, T.', 'Wagner, L.', 'Becker, S.'];
  
  // Generate work orders for all 144 trains with IHB-based intervals
  for (let trainNum = 1; trainNum <= 144; trainNum++) {
    // Determine vehicle type and IHB profile
    let vehicleType, ihbProfile, depot;
    if (trainNum <= 59) {
      vehicleType = 'flirt_3_160';
      ihbProfile = IHB_PROFILES.flirt_3_160;
      depot = 'Essingen';
    } else if (trainNum <= 108) {
      vehicleType = 'mireo_3_plus_h';
      ihbProfile = IHB_PROFILES.mireo_3_plus_h;
      depot = 'Langweid';
    } else {
      vehicleType = 'desiro_hc';
      ihbProfile = IHB_PROFILES.desiro_hc;
      depot = 'Langweid';
    }
    
    // Calculate which maintenance is due based on mileage
    const mileageKm = 50000 + (trainNum * 1000); // Example mileage
    const types = ['IS1', 'IS2', 'IS3', 'IS4', 'cleaning'];
    
    // Determine which maintenance type based on IHB intervals
    let type = 'IS1';
    let priority = 'LOW';
    
    // Check which maintenance is due based on IHB intervals
    if (mileageKm % ihbProfile.preventiveIntervals.IS4.intervalKm < 1000) {
      type = 'IS4';
      priority = 'CRITICAL';
    } else if (mileageKm % ihbProfile.preventiveIntervals.IS3.intervalKm < 2000) {
      type = 'IS3';
      priority = 'HIGH';
    } else if (mileageKm % ihbProfile.preventiveIntervals.IS2.intervalKm < 3000) {
      type = 'IS2';
      priority = 'MEDIUM';
    } else if (trainNum % 7 === 0) {
      type = 'cleaning';
      priority = 'LOW';
    } else {
      type = 'IS1';
      priority = 'LOW';
    }
    
    // Add corrective maintenance for some trains
    if (trainNum % 13 === 0) {
      type = 'corrective';
      priority = 'HIGH';
    }
    
    const interval = (ihbProfile.preventiveIntervals as any)[type] || { durationHours: 4, teamSize: 2 };
    const status = statuses[trainNum % statuses.length];
    
    // Calculate due date based on IHB intervals
    const dueDate = new Date();
    if (type === 'IS1') dueDate.setDate(dueDate.getDate() + ihbProfile.preventiveIntervals.IS1.intervalDays);
    else if (type === 'IS2') dueDate.setDate(dueDate.getDate() + Math.floor(ihbProfile.preventiveIntervals.IS2.intervalDays / 4));
    else if (type === 'IS3') dueDate.setDate(dueDate.getDate() + Math.floor(ihbProfile.preventiveIntervals.IS3.intervalDays / 3));
    else if (type === 'IS4') dueDate.setDate(dueDate.getDate() + Math.floor(ihbProfile.preventiveIntervals.IS4.intervalDays / 12));
    else if (type === 'cleaning') dueDate.setDate(dueDate.getDate() + ihbProfile.preventiveIntervals.cleaning.intervalDays);
    else dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14));
    
    const trainId = trainNum <= 59 ? `FLIRT-${60000 + trainNum}` :
                   trainNum <= 108 ? `MIREO-${60000 + trainNum}` :
                   `DESIRO-${60000 + trainNum}`;
    
    workOrders.push({
      id: `WO-${String(workOrders.length + 1).padStart(6, '0')}`,
      trainId,
      vehicleType,
      type,
      title: type === 'IS1' ? 'Tägliche Prüfung' :
             type === 'IS2' ? 'Monatswartung' :
             type === 'IS3' ? 'Quartalswartung' :
             type === 'IS4' ? 'Hauptuntersuchung' :
             type === 'corrective' ? 'Fehlerkorrektur' :
             type === 'cleaning' ? 'Reinigung' :
             type === 'lathe' ? 'Radsatzbearbeitung' :
             'Unfallreparatur',
      description: `${type} für ${trainId} - basierend auf IHB-Profil ${vehicleType}`,
      priority,
      status,
      dueDate: dueDate.toISOString(),
      assignedTo: technicians[Math.floor(Math.random() * technicians.length)],
      depot,
      ecmLevel: type === 'IS4' ? 2 : type === 'IS3' ? 3 : 4,
      estimatedDuration: interval.durationHours,
      teamSize: interval.teamSize,
      mileageAtService: mileageKm,
      nextServiceKm: type.startsWith('IS') ? mileageKm + (ihbProfile.preventiveIntervals as any)[type]?.intervalKm : null,
      skillsRequired: type === 'IS4' ? ['Mechanik', 'Elektrik', 'Hydraulik', 'Software'] :
                      type === 'IS3' ? ['Mechanik', 'Elektrik'] :
                      ['Mechanik'],
      featuresRequired: type === 'IS4' ? ['Halle', 'Grube', 'OL', 'Radsatzdrehmaschine'] :
                       type === 'IS3' ? ['Halle', 'Grube'] :
                       type === 'cleaning' ? ['Waschhalle'] :
                       ['Grube'],
      ihbProfile: vehicleType,
      checklist: type.startsWith('IS') ? [
        { id: 'chk1', name: 'Sicherheitsprüfung', done: status === 'COMPLETED' },
        { id: 'chk2', name: 'Funktionsprüfung', done: status === 'COMPLETED' },
        { id: 'chk3', name: 'Dokumentation', done: status === 'COMPLETED' }
      ] : [],
      notes: status === 'COMPLETED' ? [
        { by: technicians[0], text: 'Wartung abgeschlossen gemäß IHB-Profil', ts: new Date().toISOString() }
      ] : []
    });
  }
  
  return workOrders;
}

export async function GET() {
  const workOrders = generateWorkOrders();
  return NextResponse.json(workOrders, {
    headers: {
      'cache-control': 'no-store',
      'x-total-count': String(workOrders.length)
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({
    ...body,
    id: `WO-${String(Date.now()).slice(-6)}`,
    status: 'OPEN',
    createdAt: new Date().toISOString()
  });
}