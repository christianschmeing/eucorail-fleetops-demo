import LogClient from './LogClient';

export interface LogEvent {
  id: string;
  time: string; // ISO8601
  type:
    | 'PolicyApproved'
    | 'WorkOrderClosed'
    | 'WorkOrderAssigned'
    | 'MaintenancePlanUpdated'
    | 'PositionStreamConnected'
    | 'AlarmRaised'
    | 'AlarmCleared'
    | 'UserLogin'
    | 'SignoffCompleted'
    | 'DataVersionTagged'
    | 'DEPOT_PLAN_UPDATE'
    | 'DEPOT_RELEASE'
    | 'DEPOT_EXPORT'
    | 'DEPOT_ALLOCATION'
    | 'DEPOT_CONFLICT'
    | 'TCMS_EVENT';
  objectType: string;
  objectId: string;
  trainId?: string;
  user?: string;
  details?: string;
}

// Event-Typ-Übersetzungen
const EVENT_TYPE_LABELS: Record<LogEvent['type'], string> = {
  PolicyApproved: 'Richtlinie genehmigt',
  WorkOrderClosed: 'Arbeitsauftrag geschlossen',
  WorkOrderAssigned: 'Arbeitsauftrag zugewiesen',
  MaintenancePlanUpdated: 'Wartungsplan aktualisiert',
  PositionStreamConnected: 'Positionsstream verbunden',
  AlarmRaised: 'Alarm ausgelöst',
  AlarmCleared: 'Alarm behoben',
  UserLogin: 'Benutzer angemeldet',
  SignoffCompleted: 'Abnahme abgeschlossen',
  DataVersionTagged: 'Datenversion markiert',
  DEPOT_PLAN_UPDATE: 'Depot-Plan geändert',
  DEPOT_RELEASE: 'Depot-Freigabe',
  DEPOT_EXPORT: 'Depot-Export',
  DEPOT_ALLOCATION: 'Depot-Zuweisung',
  DEPOT_CONFLICT: 'Depot-Konflikt',
  TCMS_EVENT: 'TCMS Ereignis',
};

// Generiere Events für alle 144 Züge
function generateEventsFor144Trains(): LogEvent[] {
  const events: LogEvent[] = [];
  const eventTypes: LogEvent['type'][] = [
    'PolicyApproved',
    'WorkOrderClosed',
    'WorkOrderAssigned',
    'MaintenancePlanUpdated',
    'PositionStreamConnected',
    'AlarmRaised',
    'AlarmCleared',
    'UserLogin',
    'SignoffCompleted',
    'DataVersionTagged',
    'DEPOT_PLAN_UPDATE',
    'DEPOT_RELEASE',
    'DEPOT_ALLOCATION',
  ];

  const users = [
    'ops.meyer@eucorail.com',
    'tech.schmidt@eucorail.com',
    'maint.mueller@eucorail.com',
    'supervisor.weber@eucorail.com',
    'admin.wagner@eucorail.com',
    'dispatcher.becker@eucorail.com',
  ];

  const detailsMap: Record<LogEvent['type'], string[]> = {
    PolicyApproved: [
      'ECM-Richtlinie 2025 freigegeben',
      'Sicherheitsprotokoll aktualisiert',
      'Wartungsintervall angepasst',
    ],
    WorkOrderClosed: [
      'Bremstest abgeschlossen',
      'Softwareupdate installiert',
      'Türmechanik geprüft',
      'Klimaanlage gewartet',
    ],
    WorkOrderAssigned: [
      'Techniker Schmidt zugeteilt',
      'Team Stuttgart übernimmt',
      'Priorität erhöht',
    ],
    MaintenancePlanUpdated: [
      'Intervall auf 30 Tage gesetzt',
      'Zusatzprüfung eingeplant',
      'Winterwartung aktiviert',
    ],
    PositionStreamConnected: ['GPS-Signal stabil', 'Telemetrie aktiv', 'Live-Tracking gestartet'],
    AlarmRaised: ['Temperaturwarnung Motor', 'Verzögerung >10min', 'Bremsenverschleiß kritisch'],
    AlarmCleared: ['Störung behoben', 'System normalisiert', 'Wartung erfolgreich'],
    UserLogin: ['Web-Portal Zugriff', 'Mobile App aktiviert', 'API-Authentifizierung'],
    SignoffCompleted: [
      'ECM-4 Freigabe erteilt',
      'Qualitätskontrolle bestanden',
      'Inspektion abgezeichnet',
    ],
    DataVersionTagged: ['v2.4.1 deployed', 'Backup erstellt', 'Konfiguration gesichert'],
    DEPOT_PLAN_UPDATE: [
      'Gleis E-H1 neu zugewiesen',
      'IS3-Wartung eingeplant',
      'Zeitfenster verschoben',
    ],
    DEPOT_RELEASE: ['Freigabe nach IS2 erteilt', 'QA abgeschlossen', 'Betrieb freigegeben'],
    DEPOT_EXPORT: ['CSV-Export Essingen', 'PDF-Bericht Langweid', 'Monatsbericht erstellt'],
    DEPOT_ALLOCATION: [
      'Zug auf Gleis L-H3 eingeplant',
      'Reserve aktiviert',
      'Notfall-Slot zugewiesen',
    ],
    DEPOT_CONFLICT: ['Doppelbelegung erkannt', 'Feature-Mismatch', 'Team-Überbuchung'],
    TCMS_EVENT: [
      'TCMS Störungsmeldung',
      'Systemhinweis aus Fahrzeug',
      'Korrekturmaßnahme vorgeschlagen',
    ],
  };

  const now = new Date();

  // Nutze die tatsächliche Flotten-Verteilung
  const fleetTrains = [];

  // Essingen Züge
  for (let i = 1; i <= 32; i++) fleetTrains.push(`RE9-${60000 + i}`);
  for (let i = 1; i <= 28; i++) fleetTrains.push(`RE8-${70000 + i}`);
  for (let i = 1; i <= 9; i++) fleetTrains.push(`RES-${90000 + i}`);

  // Langweid Züge
  for (let i = 1; i <= 30; i++) fleetTrains.push(`MEX16-${80000 + i}`);
  for (let i = 1; i <= 18; i++) fleetTrains.push(`MEX12-${81000 + i}`);
  for (let i = 1; i <= 18; i++) fleetTrains.push(`S6-${82000 + i}`);
  for (let i = 1; i <= 18; i++) fleetTrains.push(`S2-${83000 + i}`);
  for (let i = 1; i <= 13; i++) fleetTrains.push(`RES-${91000 + i}`);

  // Stelle sicher, dass JEDER Zug mindestens 2 Events hat
  fleetTrains.forEach((trainId, trainNum) => {
    // Mindestens 2-4 Events pro Zug in den letzten 48h
    const numEvents = 2 + Math.floor(Math.random() * 3);

    for (let e = 0; e < numEvents; e++) {
      const hoursAgo = Math.random() * 48; // Zufällig in den letzten 48h
      const eventTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

      // Bestimme objectType basierend auf eventType
      let objectType = 'Train';
      let objectId = trainId;

      if (eventType === 'WorkOrderClosed' || eventType === 'WorkOrderAssigned') {
        objectType = 'WorkOrder';
        objectId = `WO-${String(10000 + trainNum * 10 + e).padStart(5, '0')}`;
      } else if (eventType === 'PolicyApproved') {
        objectType = 'Policy';
        objectId = `POL-${String(1000 + Math.floor(Math.random() * 100)).padStart(4, '0')}`;
      } else if (eventType === 'SignoffCompleted') {
        objectType = 'Signoff';
        objectId = `SIG-${String(5000 + trainNum).padStart(5, '0')}`;
      }

      events.push({
        id: `evt-${trainNum}-${e}-${Date.now()}`,
        time: eventTime.toISOString(),
        type: eventType,
        objectType,
        objectId,
        trainId, // IMMER gesetzt für Flottenabdeckung
        user: users[Math.floor(Math.random() * users.length)],
        details: detailsMap[eventType][Math.floor(Math.random() * detailsMap[eventType].length)],
      });
    }
  });

  // Füge zusätzliche System-Events hinzu (ohne trainId)
  for (let i = 0; i < 50; i++) {
    const hoursAgo = Math.random() * 48;
    const eventTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    events.push({
      id: `sys-evt-${i}-${Date.now()}`,
      time: eventTime.toISOString(),
      type: 'DataVersionTagged',
      objectType: 'System',
      objectId: 'SYS-CORE',
      user: 'system@eucorail.com',
      details: [
        'Backup abgeschlossen',
        'Datenbank optimiert',
        'Cache geleert',
        'Logs rotiert',
        'Metriken aggregiert',
      ][i % 5],
    });
  }

  // Sortiere nach Zeit (neueste zuerst)
  return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

export default async function LogPage() {
  // SSR: Generiere Events serverseitig
  const events = generateEventsFor144Trains();
  // Enrich with live TCMS events if available
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || '';
    const r = await fetch(`${base}/api/tcms/events`, { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      const tcms = Array.isArray(j.events) ? j.events : [];
      for (const e of tcms) {
        events.push({
          id: e.id || `tcms-${Math.random().toString(36).slice(2, 8)}`,
          time: e.ts || new Date().toISOString(),
          type: 'TCMS_EVENT',
          objectType: 'TCMS',
          objectId: e.code || 'TCMS',
          trainId: e.trainId,
          user: 'tcms@train',
          details: e.humanMessage || e.code,
        });
      }
    }
  } catch {}

  // Berechne unique train IDs für Abdeckung
  const uniqueTrainIds = new Set(events.filter((e) => e.trainId).map((e) => e.trainId!));

  // Zusätzliche Daten für Client
  const eventTypeLabels = EVENT_TYPE_LABELS;

  return (
    <LogClient
      initialEvents={events}
      uniqueTrainIds={uniqueTrainIds.size}
      eventTypeLabels={eventTypeLabels}
    />
  );
}
