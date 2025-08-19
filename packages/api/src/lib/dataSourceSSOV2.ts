// DataSource Implementation mit SSOT V2 - Reale Linien & IHB-Profile
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fleetSSOV2, STATUS_LABELS_DE, DEPOTS, type TrainStatus } from './ssot-v2.js';
import type { DataSource, Train, Line, Depot, KPI, WorkOrder, Policy, Measure, Signoff } from './dataSource.js';
// ECM Store simuliert
const ecmStore = {
  workOrders: [] as any[],
  policies: [] as any[],
  signoffs: [] as any[],
  measures: [] as any[],
  
  getWorkOrders() { return this.workOrders; },
  getWorkOrder(id: string) { return this.workOrders.find(wo => wo.id === id); },
  addWorkOrder(wo: any) { this.workOrders.push(wo); },
  getPolicies() { return this.policies; },
  addPolicy(p: any) { this.policies.push(p); },
  getSignoffs() { return this.signoffs; },
  addSignoff(s: any) { this.signoffs.push(s); }
};

export class SSOV2DataSource implements DataSource {
  async getHealth() {
    const startedAt = Math.floor((Date.now() - Math.floor(process.uptime() * 1000)) / 1000);
    return {
      ok: true,
      version: '0.2.0-ssov2',
      uptimeSec: Math.floor(process.uptime()),
      startedAtSec: startedAt,
      deps: { fastify: '5.x' },
    };
  }

  async getLines(): Promise<Line[]> {
    const ssotLines = fleetSSOV2.getLines();
    
    return ssotLines.map(line => ({
      id: line.lineCode,
      name: line.lineName,
      code: line.lineCode,
      operator: line.operator,
      region: line.region,
      depots: line.region === 'BW' ? ['Essingen'] : ['Langweid'],
      vehicleCount: line.fleetCount || 0,
      trainCount: line.fleetCount || 0,
      activeVehicles: Math.floor((line.fleetCount || 0) * 0.75),
      status: 'active',
      color: line.lineCode.startsWith('S') ? '#00a651' : 
             line.lineCode.startsWith('RE') ? '#003da5' : 
             line.lineCode.startsWith('MEX') ? '#e30613' : '#666',
      kmPerDay: line.kmPerDayMean,
      runWindow: `${line.runWindowStart} - ${line.runWindowEnd}`
    }));
  }

  async getDepots(): Promise<Depot[]> {
    return DEPOTS.map(depot => {
      const trainsInDepot = fleetSSOV2.getTrainsByDepot(depot.id);
      const occupiedTracks = trainsInDepot
        .filter(t => t.status === 'maintenance' || t.status === 'abstellung' || t.status === 'reserve')
        .slice(0, depot.tracks.length);
      
      return {
        id: depot.id,
        name: depot.name,
        location: depot.name,
        region: depot.region,
        coordinates: depot.coordinates,
        lat: depot.coordinates.lat,
        lng: depot.coordinates.lng,
        tracks: depot.tracks.map((track, idx) => ({
          ...track,
          occupied: idx < occupiedTracks.length,
          currentTrain: occupiedTracks[idx]?.trainId
        })),
        capacity: depot.tracks.length,
        occupancy: occupiedTracks.length,
        type: 'maintenance',
        features: [...new Set(depot.tracks.flatMap(t => t.features))]
      };
    });
  }

  async getTrains(filters?: {
    fleetId?: string;
    lineId?: string;
    status?: string;
    limit?: number;
  }): Promise<Train[]> {
    let ssotTrains = fleetSSOV2.getAllTrains();
    
    // Filter anwenden
    if (filters?.lineId) {
      ssotTrains = ssotTrains.filter(t => t.lineCode === filters.lineId);
    }
    if (filters?.status) {
      const statusMap: Record<string, TrainStatus> = {
        'active': 'active',
        'maintenance': 'maintenance',
        'alarm': 'alarm',
        'offline': 'offline',
        'reserve': 'reserve',
        'abstellung': 'abstellung',
        'standby': 'abstellung'
      };
      const mappedStatus = statusMap[filters.status] || filters.status as TrainStatus;
      ssotTrains = ssotTrains.filter(t => t.status === mappedStatus);
    }
    
    let trains = ssotTrains.map(t => {
      const line = fleetSSOV2.getLineByCode(t.lineCode);
      const ihbProfile = fleetSSOV2.getIHBProfile(t.vehicleType);
      const nextMaintenance = fleetSSOV2.calculateNextMaintenance(t);
      
      return {
        id: t.trainId,
        runId: t.trainId,
        lineId: t.lineCode,
        line: t.lineCode,
        lineCode: t.lineCode,
        lineName: line?.lineName || t.lineCode,
        fleetId: 'fleet-01',
        vehicleType: t.vehicleType,
        vehicleFamily: ihbProfile?.family || 'Unknown',
        manufacturer: ihbProfile?.manufacturer || 'Unknown',
        status: t.status,
        statusLabel: STATUS_LABELS_DE[t.status],
        isReserve: t.isReserve,
        homeDepot: t.homeDepot,
        currentLocation: t.currentLocation,
        geo: t.currentLocation,
        lastSeenAt: t.lastSeenAt,
        delayMin: t.delayMin || 0,
        region: t.region,
        model: ihbProfile?.configuration || 'Unknown',
        capacity: ihbProfile?.capacity || 200,
        lengthM: ihbProfile?.lengthM || 60,
        seatConfig: '2+2',
        mileageKm: t.mileageKm || 0,
        nextMaintenanceAt: nextMaintenance?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        nextMaintenanceType: nextMaintenance?.type || 'IS2',
        nextMaintenanceName: nextMaintenance?.name || 'Planmäßige Wartung',
        occupancyPct: t.status === 'active' ? Math.floor(Math.random() * 100) : 0,
        speedKmh: t.status === 'active' ? Math.floor(Math.random() * 160) : 0,
        socPct: Math.floor(Math.random() * 40) + 60,
        notes: t.notes
      };
    });
    
    if (filters?.limit) {
      trains = trains.slice(0, filters.limit);
    }
    
    return trains;
  }

  async getTrainById(id: string): Promise<Train | undefined> {
    const ssotTrain = fleetSSOV2.getTrainById(id);
    if (!ssotTrain) return undefined;
    
    const line = fleetSSOV2.getLineByCode(ssotTrain.lineCode);
    const ihbProfile = fleetSSOV2.getIHBProfile(ssotTrain.vehicleType);
    const nextMaintenance = fleetSSOV2.calculateNextMaintenance(ssotTrain);
    
    return {
      id: ssotTrain.trainId,
      runId: ssotTrain.trainId,
      lineId: ssotTrain.lineCode,
      line: ssotTrain.lineCode,
      lineCode: ssotTrain.lineCode,
      lineName: line?.lineName || ssotTrain.lineCode,
      fleetId: 'fleet-01',
      vehicleType: ssotTrain.vehicleType,
      vehicleFamily: ihbProfile?.family || 'Unknown',
      manufacturer: ihbProfile?.manufacturer || 'Unknown',
      status: ssotTrain.status,
      statusLabel: STATUS_LABELS_DE[ssotTrain.status],
      isReserve: ssotTrain.isReserve,
      homeDepot: ssotTrain.homeDepot,
      currentLocation: ssotTrain.currentLocation,
      geo: ssotTrain.currentLocation,
      lastSeenAt: ssotTrain.lastSeenAt,
      delayMin: ssotTrain.delayMin || 0,
      region: ssotTrain.region,
      model: ihbProfile?.configuration || 'Unknown',
      capacity: ihbProfile?.capacity || 200,
      lengthM: ihbProfile?.lengthM || 60,
      seatConfig: '2+2',
      mileageKm: ssotTrain.mileageKm || 0,
      nextMaintenanceAt: nextMaintenance?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      nextMaintenanceType: nextMaintenance?.type || 'IS2',
      nextMaintenanceName: nextMaintenance?.name || 'Planmäßige Wartung',
      occupancyPct: ssotTrain.status === 'active' ? Math.floor(Math.random() * 100) : 0,
      speedKmh: ssotTrain.status === 'active' ? Math.floor(Math.random() * 160) : 0,
      socPct: Math.floor(Math.random() * 40) + 60,
      notes: ssotTrain.notes
    };
  }

  async getKPI(): Promise<KPI> {
    const report = fleetSSOV2.getConsistencyReport();
    const fleetSize = report.totalTrains;
    
    // Berechne Verfügbarkeit
    const activeTrains = report.byStatus.active;
    const availabilityPct = Math.round((activeTrains / fleetSize) * 100);
    
    // Depot-Auslastung
    const depotUtilToday: Record<string, number> = {};
    for (const depot of DEPOTS) {
      const trainsInDepot = fleetSSOV2.getTrainsByDepot(depot.id).filter(t => 
        t.status === 'maintenance' || t.status === 'abstellung'
      ).length;
      depotUtilToday[depot.id] = Math.round((trainsInDepot / depot.tracks.length) * 100);
    }
    
    // ECM-spezifische KPIs
    const ecmCatalog = fleetSSOV2.getECMCatalog();
    const overdueCount = Math.floor(Math.random() * 5); // Simulation
    const woAgingMedianDays = 3 + Math.floor(Math.random() * 7);
    
    return {
      availabilityPct,
      overdueCount,
      woAgingMedianDays,
      depotUtilToday,
      fleetSize,
      // Erweiterte KPIs als any für Flexibilität
      ...{
        mtbf: 428, // Mean Time Between Failures (Stunden)
        mttr: 2.4, // Mean Time To Repair (Stunden)
        ecmCompliance: 92.3, // ECM-Konformität %
        vehicleTypes: report.byVehicleType,
        lineDistribution: report.byLine
      } as any
    };
  }

  // ECM-Methoden
  async listWOs(): Promise<{ items: WorkOrder[]; capacity: any[] }> {
    const wos = ecmStore.getWorkOrders();
    const ecmCatalog = fleetSSOV2.getECMCatalog();
    
    // Ergänze WOs mit ECM-Katalog-Informationen
    const enrichedWOs = wos.map((wo: any) => {
      const task = ecmCatalog.preventive_tasks[wo.type] || 
                   ecmCatalog.corrective_tasks[wo.type] || 
                   ecmCatalog.accident_tasks[wo.type];
      
      if (task) {
        wo.ecmLevel = task.ecm_level;
        wo.skillsRequired = task.skills_required;
        wo.featuresRequired = task.features_required;
        wo.estimatedDuration = task.default_duration_h;
      }
      
      return wo;
    });
    
    // Generiere realistische Kapazitätsdaten basierend auf Depot-Tracks
    const capacity = [];
    for (const depot of DEPOTS) {
      for (let i = 0; i < 14; i++) { // 2 Wochen voraus
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const trainsInDepot = fleetSSOV2.getTrainsByDepot(depot.id).filter(t => 
          t.status === 'maintenance'
        ).length;
        
        const maxCapacity = depot.tracks.filter(t => 
          t.features.includes('Halle') || t.features.includes('Grube')
        ).length;
        
        capacity.push({
          depotId: depot.id,
          date: date.toISOString().split('T')[0],
          count: trainsInDepot + Math.floor(Math.random() * 3),
          maxCapacity,
          warning: trainsInDepot > maxCapacity * 0.8
        });
      }
    }
    
    return { items: enrichedWOs, capacity };
  }

  async createWO(wo: WorkOrder): Promise<{ ok: true }> {
    // Ergänze mit IHB-Profil-Daten
    const train = fleetSSOV2.getTrainById(wo.trainId);
    if (train) {
      const ihbProfile = fleetSSOV2.getIHBProfile(train.vehicleType);
      if (ihbProfile && (wo as any).type in ihbProfile.preventiveIntervals) {
        const interval = ihbProfile.preventiveIntervals[(wo as any).type];
        (wo as any).estimatedDuration = interval.duration_hours;
        (wo as any).skillsRequired = interval.skills;
        (wo as any).featuresRequired = interval.features_required;
      }
    }
    
    ecmStore.addWorkOrder(wo);
    return { ok: true };
  }

  async updateWO(id: string, patch: Partial<WorkOrder>): Promise<{ ok: true } | { error: 'not_found' }> {
    const wo = ecmStore.getWorkOrder(id);
    if (!wo) return { error: 'not_found' };
    
    Object.assign(wo, patch);
    return { ok: true };
  }

  async toggleChecklist(
    id: string,
    itemId: string,
    done: boolean
  ): Promise<{ ok: true } | { error: 'not_found' }> {
    const wo = ecmStore.getWorkOrder(id);
    if (!wo) return { error: 'not_found' };
    
    const item = wo.checklist?.find((i: any) => i.id === itemId);
    if (item) {
      item.done = done;
    }
    
    return { ok: true };
  }

  async completeWO(id: string): Promise<{ ok: true } | { error: 'not_found' }> {
    const wo = ecmStore.getWorkOrder(id);
    if (!wo) return { error: 'not_found' };
    
    wo.status = 'completed';
    wo.completedAt = new Date().toISOString();
    
    // Update train status wenn WO abgeschlossen
    if (wo.trainId) {
      // Hier würde normalerweise der Zug-Status aktualisiert werden
      // fleetSSOV2.updateTrainStatus(wo.trainId, 'active');
    }
    
    return { ok: true };
  }

  async listPolicies(): Promise<Policy[]> {
    return ecmStore.getPolicies();
  }

  async savePolicies(policies: Policy[]): Promise<{ ok: true }> {
    policies.forEach(p => ecmStore.addPolicy(p));
    return { ok: true };
  }

  async listMeasures(): Promise<Measure[]> {
    // Generiere Measures basierend auf ECM-Katalog
    const ecmCatalog = fleetSSOV2.getECMCatalog();
    const measures: Measure[] = [];
    
    for (const [key, task] of Object.entries(ecmCatalog.preventive_tasks as any)) {
      const t = task as any;
      measures.push({
        id: key,
        name: t.name || key,
        description: t.description,
        category: 'Präventiv',
        ecmLevel: t.ecm_level,
        frequency: t.interval_days ? `Alle ${t.interval_days} Tage` : 'Nach Bedarf',
        lastReview: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      } as any);
    }
    
    return measures;
  }

  async listSignoffs(): Promise<Signoff[]> {
    return ecmStore.getSignoffs();
  }

  async appendSignoff(s: Signoff): Promise<{ ok: true }> {
    ecmStore.addSignoff(s);
    return { ok: true };
  }
}
