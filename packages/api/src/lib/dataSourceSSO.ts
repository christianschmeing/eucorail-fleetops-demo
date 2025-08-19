// DataSource Implementation mit SSOT-Integration
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fleetSSO, STATUS_LABELS_DE, DEPOTS, LINES, type TrainStatus } from './ssot.js';
import type { DataSource, Train, Line, Depot, KPI, WorkOrder, Policy, Measure, Signoff } from './dataSource.js';
// ECM imports simuliert
const ecmStore = {
  workOrders: [] as any[],
  policies: [] as any[],
  signoffs: [] as any[],
  
  getWorkOrders() { return this.workOrders; },
  getWorkOrder(id: string) { return this.workOrders.find(wo => wo.id === id); },
  addWorkOrder(wo: any) { this.workOrders.push(wo); },
  getPolicies() { return this.policies; },
  addPolicy(p: any) { this.policies.push(p); },
  getSignoffs() { return this.signoffs; },
  addSignoff(s: any) { this.signoffs.push(s); }
};

const ecmMaintenance = {
  generateCapacityPlan() {
    return [];
  },
  getRiskParts() {
    return [];
  },
  getMeasures() {
    return [];
  }
};

export class SSODataSource implements DataSource {
  async getHealth() {
    const startedAt = Math.floor((Date.now() - Math.floor(process.uptime() * 1000)) / 1000);
    return {
      ok: true,
      version: '0.1.0-sso',
      uptimeSec: Math.floor(process.uptime()),
      startedAtSec: startedAt,
      deps: { fastify: '5.x' },
    };
  }

  async getLines(): Promise<Line[]> {
    // Verwende SSOT Linien-Definitionen
    return LINES.map(line => ({
      id: line.lineCode,
      name: line.name,
      code: line.lineCode,
      operator: line.operator,
      region: line.region,
      depots: line.depots,
      vehicleCount: line.fleetCount,
      trainCount: line.fleetCount,
      status: 'active',
      color: line.lineCode.startsWith('S') ? '#00a651' : '#003da5'
    }));
  }

  async getDepots(): Promise<Depot[]> {
    // Verwende SSOT Depot-Definitionen
    return DEPOTS.map(depot => ({
      id: depot.id,
      name: depot.name,
      location: depot.name,
      region: depot.region,
      coordinates: depot.coordinates,
      lat: depot.coordinates.lat,
      lng: depot.coordinates.lng,
      tracks: depot.tracks,
      capacity: depot.tracks.length,
      occupancy: fleetSSO.getTrainsByDepot(depot.id).filter(t => 
        t.status === 'maintenance' || t.status === 'abstellung' || t.status === 'reserve'
      ).length,
      type: 'maintenance'
    }));
  }

  async getTrains(filters?: {
    fleetId?: string;
    lineId?: string;
    status?: string;
    limit?: number;
  }): Promise<Train[]> {
    // Verwende SSOT für 144-Züge-Flotte
    let ssotTrains = fleetSSO.getAllTrains();
    
    // Filter anwenden
    if (filters?.lineId) {
      ssotTrains = ssotTrains.filter(t => t.lineCode === filters.lineId);
    }
    if (filters?.status) {
      // Map Frontend-Status zu SSOT-Status
      const statusMap: Record<string, TrainStatus> = {
        'active': 'active',
        'maintenance': 'maintenance',
        'alarm': 'alarm',
        'offline': 'offline',
        'reserve': 'reserve',
        'abstellung': 'abstellung',
        'standby': 'abstellung' // Legacy mapping
      };
      const mappedStatus = statusMap[filters.status] || filters.status as TrainStatus;
      ssotTrains = ssotTrains.filter(t => t.status === mappedStatus);
    }
    
    let trains = ssotTrains.map(t => ({
      id: t.trainId,
      runId: t.trainId,
      lineId: t.lineCode,
      line: t.lineCode,
      lineCode: t.lineCode,
      fleetId: 'fleet-01',
      status: t.status,
      statusLabel: STATUS_LABELS_DE[t.status],
      isReserve: t.isReserve,
      homeDepot: t.homeDepot,
      currentLocation: t.currentLocation,
      geo: t.currentLocation,
      lastSeenAt: t.lastSeenAt,
      delayMin: t.delayMin || 0,
      region: t.region,
      model: 'Siemens Mireo',
      capacity: 200,
      seatConfig: '2+2',
      nextMaintenanceAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      occupancyPct: t.status === 'active' ? Math.floor(Math.random() * 100) : 0,
      speedKmh: t.status === 'active' ? Math.floor(Math.random() * 160) : 0,
      socPct: Math.floor(Math.random() * 40) + 60
    }));
    
    if (filters?.limit) {
      trains = trains.slice(0, filters.limit);
    }
    
    return trains;
  }

  async getTrainById(id: string): Promise<Train | undefined> {
    const ssotTrain = fleetSSO.getTrainById(id);
    if (!ssotTrain) return undefined;
    
    return {
      id: ssotTrain.trainId,
      runId: ssotTrain.trainId,
      lineId: ssotTrain.lineCode,
      line: ssotTrain.lineCode,
      lineCode: ssotTrain.lineCode,
      fleetId: 'fleet-01',
      status: ssotTrain.status,
      statusLabel: STATUS_LABELS_DE[ssotTrain.status],
      isReserve: ssotTrain.isReserve,
      homeDepot: ssotTrain.homeDepot,
      currentLocation: ssotTrain.currentLocation,
      geo: ssotTrain.currentLocation,
      lastSeenAt: ssotTrain.lastSeenAt,
      delayMin: ssotTrain.delayMin || 0,
      region: ssotTrain.region,
      model: 'Siemens Mireo',
      capacity: 200,
      seatConfig: '2+2',
      nextMaintenanceAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      occupancyPct: ssotTrain.status === 'active' ? Math.floor(Math.random() * 100) : 0,
      speedKmh: ssotTrain.status === 'active' ? Math.floor(Math.random() * 160) : 0,
      socPct: Math.floor(Math.random() * 40) + 60
    };
  }

  async getKPI(): Promise<KPI> {
    // Verwende SSOT für konsistente KPIs
    const report = fleetSSO.getConsistencyReport();
    const fleetSize = report.totalTrains;
    
    // Berechne Verfügbarkeit
    const activeTrains = report.byStatus.active;
    const availabilityPct = Math.round((activeTrains / fleetSize) * 100);
    
    // Depot-Auslastung
    const depotUtilToday: Record<string, number> = {};
    for (const depot of DEPOTS) {
      const trainsInDepot = fleetSSO.getTrainsByDepot(depot.id).filter(t => 
        t.status === 'maintenance' || t.status === 'abstellung'
      ).length;
      depotUtilToday[depot.id] = Math.round((trainsInDepot / depot.tracks.length) * 100);
    }
    
    return {
      availabilityPct,
      overdueCount: Math.floor(Math.random() * 5), // Dummy
      woAgingMedianDays: 3 + Math.floor(Math.random() * 7), // Dummy
      depotUtilToday,
      fleetSize
    };
  }

  // ECM-Methoden (delegiere an ecm.ts)
  async listWOs(): Promise<{ items: WorkOrder[]; capacity: any[] }> {
    const wos = ecmStore.getWorkOrders();
    
    // Generiere Kapazitätsdaten für beide Depots
    const capacity = [];
    for (const depot of DEPOTS) {
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const trainsInDepot = fleetSSO.getTrainsByDepot(depot.id).filter(t => 
          t.status === 'maintenance'
        ).length;
        
        capacity.push({
          depotId: depot.id,
          date: date.toISOString().split('T')[0],
          count: trainsInDepot + Math.floor(Math.random() * 3),
          warning: trainsInDepot > depot.tracks.length * 0.8
        });
      }
    }
    
    return { items: wos, capacity };
  }

  async createWO(wo: WorkOrder): Promise<{ ok: true }> {
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
      fleetSSO.updateTrainStatus(wo.trainId, 'active');
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
    return ecmMaintenance.getMeasures();
  }

  async listSignoffs(): Promise<Signoff[]> {
    return ecmStore.getSignoffs();
  }

  async appendSignoff(s: Signoff): Promise<{ ok: true }> {
    ecmStore.addSignoff(s);
    return { ok: true };
  }
}
