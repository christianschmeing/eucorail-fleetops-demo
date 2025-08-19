import { NextResponse } from 'next/server';

// Generate realistic work orders for 144 trains
function generateWorkOrders() {
  const workOrders = [];
  const types = ['IS1', 'IS2', 'IS3', 'IS4', 'corrective', 'cleaning', 'lathe', 'accident'];
  const statuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const depots = ['Essingen', 'Langweid'];
  const technicians = ['Schmidt, M.', 'Müller, K.', 'Weber, T.', 'Wagner, L.', 'Becker, S.'];
  
  // Generate 150 work orders (more than trains for realistic maintenance load)
  for (let i = 1; i <= 150; i++) {
    const trainNum = Math.floor(Math.random() * 144) + 1;
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const priority = type === 'IS4' ? 'CRITICAL' : 
                    type === 'IS3' ? 'HIGH' :
                    type === 'corrective' ? 'HIGH' :
                    type === 'accident' ? 'CRITICAL' :
                    type === 'IS2' ? 'MEDIUM' : 'LOW';
    
    const dueDate = new Date();
    if (type === 'IS1') dueDate.setDate(dueDate.getDate() + 1);
    else if (type === 'IS2') dueDate.setDate(dueDate.getDate() + 7);
    else if (type === 'IS3') dueDate.setDate(dueDate.getDate() + 30);
    else if (type === 'IS4') dueDate.setDate(dueDate.getDate() + 90);
    else dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14));
    
    const trainId = trainNum <= 59 ? `FLIRT-${60000 + trainNum}` :
                   trainNum <= 108 ? `MIREO-${60000 + trainNum}` :
                   `DESIRO-${60000 + trainNum}`;
    
    const vehicleType = trainNum <= 59 ? 'flirt_3_160' :
                       trainNum <= 108 ? 'mireo_3_plus_h' :
                       'desiro_hc';
    
    workOrders.push({
      id: `WO-${String(i).padStart(6, '0')}`,
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
      description: `${type} für ${trainId}`,
      priority,
      status,
      dueDate: dueDate.toISOString(),
      assignedTo: technicians[Math.floor(Math.random() * technicians.length)],
      depot: trainNum <= 59 ? 'Essingen' : 'Langweid',
      ecmLevel: type === 'IS4' ? 2 : type === 'IS3' ? 3 : 4,
      estimatedDuration: type === 'IS4' ? 48 : 
                        type === 'IS3' ? 12 :
                        type === 'IS2' ? 4 :
                        type === 'corrective' ? 8 :
                        2,
      skillsRequired: type === 'IS4' ? ['Mechanik', 'Elektrik', 'Hydraulik', 'Software'] :
                      type === 'IS3' ? ['Mechanik', 'Elektrik'] :
                      ['Mechanik'],
      featuresRequired: type === 'IS4' ? ['Halle', 'Grube', 'OL', 'Radsatzdrehmaschine'] :
                       type === 'IS3' ? ['Halle', 'Grube'] :
                       ['Grube'],
      checklist: type.startsWith('IS') ? [
        { id: 'chk1', name: 'Sicherheitsprüfung', done: status === 'COMPLETED' },
        { id: 'chk2', name: 'Funktionsprüfung', done: status === 'COMPLETED' },
        { id: 'chk3', name: 'Dokumentation', done: status === 'COMPLETED' }
      ] : [],
      notes: status === 'COMPLETED' ? [
        { by: technicians[0], text: 'Wartung abgeschlossen', ts: new Date().toISOString() }
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