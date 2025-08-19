import { NextResponse } from 'next/server';

// Generate realistic events for all 144 trains
function generateEvents() {
  const events = [];
  const eventTypes = [
    'TRAIN_DEPARTURE', 'TRAIN_ARRIVAL', 'TRAIN_DELAY', 'TRAIN_ON_TIME',
    'MAINTENANCE_START', 'MAINTENANCE_COMPLETE', 'MAINTENANCE_SCHEDULED',
    'DEPOT_ALLOCATION', 'DEPOT_RELEASE', 'DEPOT_CONFLICT',
    'ECM_CHECK_START', 'ECM_CHECK_COMPLETE', 
    'RESERVE_ACTIVATED', 'RESERVE_DEACTIVATED',
    'ALARM_RAISED', 'ALARM_CLEARED',
    'CLEANING_START', 'CLEANING_COMPLETE',
    'LATHE_START', 'LATHE_COMPLETE'
  ];
  
  const severities = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
  const depots = ['Essingen', 'Langweid'];
  
  // Generate events for last 48 hours, ensuring all 144 trains appear at least once
  const now = Date.now();
  const twoDAysAgo = now - (48 * 60 * 60 * 1000);
  
  // First, ensure each train has at least one event
  for (let trainNum = 1; trainNum <= 144; trainNum++) {
    const trainId = trainNum <= 59 ? `FLIRT-${60000 + trainNum}` :
                   trainNum <= 108 ? `MIREO-${60000 + trainNum}` :
                   `DESIRO-${60000 + trainNum}`;
    
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const severity = eventType.includes('ALARM') || eventType.includes('CONFLICT') ? 'ERROR' :
                    eventType.includes('DELAY') ? 'WARNING' : 'INFO';
    
    events.push({
      id: `EVT-${String(events.length + 1).padStart(6, '0')}`,
      timestamp: new Date(twoDAysAgo + Math.random() * (now - twoDAysAgo)).toISOString(),
      type: eventType,
      severity,
      trainId,
      message: generateEventMessage(eventType, trainId),
      depot: eventType.includes('DEPOT') ? depots[trainNum % 2] : undefined,
      metadata: {
        trainNum,
        lineCode: getLineForTrain(trainNum),
        location: eventType.includes('DEPOT') ? depots[trainNum % 2] : 'Strecke',
        duration: eventType.includes('MAINTENANCE') ? Math.floor(Math.random() * 8) + 1 : undefined
      }
    });
  }
  
  // Add additional events to reach 200+ total
  for (let i = 144; i < 250; i++) {
    const trainNum = Math.floor(Math.random() * 144) + 1;
    const trainId = trainNum <= 59 ? `FLIRT-${60000 + trainNum}` :
                   trainNum <= 108 ? `MIREO-${60000 + trainNum}` :
                   `DESIRO-${60000 + trainNum}`;
    
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const severity = eventType.includes('ALARM') || eventType.includes('CONFLICT') ? 'ERROR' :
                    eventType.includes('DELAY') ? 'WARNING' : 'INFO';
    
    events.push({
      id: `EVT-${String(events.length + 1).padStart(6, '0')}`,
      timestamp: new Date(twoDAysAgo + Math.random() * (now - twoDAysAgo)).toISOString(),
      type: eventType,
      severity,
      trainId,
      message: generateEventMessage(eventType, trainId),
      depot: eventType.includes('DEPOT') ? depots[trainNum % 2] : undefined,
      metadata: {
        trainNum,
        lineCode: getLineForTrain(trainNum),
        location: eventType.includes('DEPOT') ? depots[trainNum % 2] : 'Strecke',
        duration: eventType.includes('MAINTENANCE') ? Math.floor(Math.random() * 8) + 1 : undefined
      }
    });
  }
  
  // Sort by timestamp descending (newest first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return events;
}

function getLineForTrain(trainNum: number): string {
  if (trainNum <= 59) {
    const bwLines = ['RE1', 'RE2', 'RE8', 'RB22', 'RB27'];
    return bwLines[trainNum % bwLines.length];
  } else if (trainNum <= 108) {
    const byLines = ['RE9', 'RE12', 'MEX16', 'MEX18', 'MEX12', 'RB32', 'RB54'];
    return byLines[trainNum % byLines.length];
  } else if (trainNum <= 122) {
    const sbLines = ['S2', 'S3', 'S4', 'S6'];
    return sbLines[trainNum % sbLines.length];
  } else {
    return 'RESERVE';
  }
}

function generateEventMessage(type: string, trainId: string): string {
  const messages: Record<string, string[]> = {
    TRAIN_DEPARTURE: ['Abfahrt von Gleis', 'Planmäßige Abfahrt', 'Verspätete Abfahrt'],
    TRAIN_ARRIVAL: ['Ankunft auf Gleis', 'Planmäßige Ankunft', 'Verspätete Ankunft'],
    TRAIN_DELAY: ['Verspätung von', 'Verzögerung wegen', 'Technische Störung'],
    MAINTENANCE_START: ['Wartung begonnen', 'IS2 gestartet', 'IS3 eingeleitet'],
    MAINTENANCE_COMPLETE: ['Wartung abgeschlossen', 'IS2 beendet', 'Freigabe erteilt'],
    DEPOT_ALLOCATION: ['Einfahrt Depot', 'Gleis zugewiesen', 'Abstellung auf Gleis'],
    DEPOT_RELEASE: ['Ausfahrt aus Depot', 'Bereitstellung', 'Freigabe für Linie'],
    ECM_CHECK_START: ['ECM-Prüfung begonnen', 'Sicherheitsprüfung', 'Qualitätskontrolle'],
    ALARM_RAISED: ['Störung gemeldet', 'Technischer Alarm', 'Wartung erforderlich'],
    RESERVE_ACTIVATED: ['Reserve aktiviert', 'Ersatzzug bereitgestellt', 'Umlenkung auf Reserve']
  };
  
  const templates = messages[type] || ['Event aufgetreten'];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  return `${trainId}: ${template}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  const trainId = searchParams.get('trainId');
  const severity = searchParams.get('severity');
  const hours = searchParams.get('hours') || '48';
  
  let events = generateEvents();
  
  // Apply filters
  if (trainId) {
    events = events.filter(e => e.trainId === trainId);
  }
  if (severity) {
    events = events.filter(e => e.severity === severity);
  }
  
  // Filter by time window
  const cutoffTime = Date.now() - (parseInt(hours) * 60 * 60 * 1000);
  events = events.filter(e => new Date(e.timestamp).getTime() > cutoffTime);
  
  if (limit) {
    events = events.slice(0, parseInt(limit));
  }
  
  return NextResponse.json(events, {
    headers: {
      'cache-control': 'no-store',
      'x-total-events': String(events.length),
      'x-unique-trains': String(new Set(events.map(e => e.trainId)).size)
    }
  });
}