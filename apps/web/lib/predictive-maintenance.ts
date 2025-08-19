export type TelemetryData = {
  component: string;
  temperature: number;
  vibration: number[];
  energyConsumption: number;
};

export type Component = {
  name: string;
  vehicleId: string;
  currentValue: number;
  limit: number;
  wearRate: number;
};

export type Vehicle = {
  id: string;
  components: Component[];
};

export type FailurePrediction = {
  component: string;
  probability: number; // 0..1
  daysToFailure: number;
  confidence: number; // 0..1
  recommendation: string;
};

export type OptimizedSchedule = {
  schedule: Array<{
    vehicles: string[];
    proposedDate: string;
    estimatedDuration: number; // hours
    requiredResources: string[];
    costSavings: number; // EUR
  }>;
  totalDowntime: number; // hours
  costSavings: number; // EUR
  availabilityImpact: number; // percentage points
};

export type Anomaly = {
  type: 'temperature' | 'vibration' | 'energy';
  severity: 'info' | 'warning' | 'critical' | number;
  component: string;
  value?: number;
  threshold?: number;
  pattern?: any;
  consumption?: number;
  expected?: number;
  recommendation: string;
};

export type HistoricalData = Record<string, unknown>;
export type MLModel = { name: string };

export interface PredictiveModel {
  predictComponentFailure(component: Component): FailurePrediction;
  optimizeMaintenanceSchedule(fleet: Vehicle[]): OptimizedSchedule;
  calculateRemainingUsefulLife(component: Component): number;
  detectAnomalies(telemetryData: TelemetryData): Anomaly[];
}

export class PredictiveMaintenanceEngine implements PredictiveModel {
  private historicalData: HistoricalData = {};
  private mlModels: Map<string, MLModel> = new Map();

  constructor() {
    this.initializeModels();
  }

  predictComponentFailure(component: Component): FailurePrediction {
    const wearPattern = this.analyzeWearPattern(component);
    const environmentalFactors = this.getEnvironmentalFactors();
    const usagePattern = this.getUsagePattern(component.vehicleId);

    const failureProbability = this.calculateFailureProbability(
      wearPattern,
      environmentalFactors,
      usagePattern
    );

    const daysToFailure = this.calculateDaysToFailure(
      component.currentValue,
      component.limit,
      wearPattern.wearRate
    );

    return {
      component: component.name,
      probability: failureProbability,
      daysToFailure,
      confidence: this.calculateConfidence(component),
      recommendation: this.generateRecommendation(failureProbability, daysToFailure),
    };
  }

  optimizeMaintenanceSchedule(fleet: Vehicle[]): OptimizedSchedule {
    const groups = this.groupByMaintenanceNeeds(fleet);
    const schedule = groups.map((group) => ({
      vehicles: group.vehicles,
      proposedDate: this.findOptimalMaintenanceWindow(group),
      estimatedDuration: this.calculateGroupMaintenanceDuration(group),
      requiredResources: this.calculateRequiredResources(group),
      costSavings: this.calculateBatchingsSavings(group),
    }));

    return {
      schedule,
      totalDowntime: this.calculateTotalDowntime(schedule),
      costSavings: this.calculateTotalSavings(schedule),
      availabilityImpact: this.calculateAvailabilityImpact(schedule),
    };
  }

  calculateRemainingUsefulLife(component: Component): number {
    const remaining = Math.max(0, component.limit - component.currentValue);
    const days = component.wearRate > 0 ? Math.round(remaining / component.wearRate) : Infinity;
    return isFinite(days) ? days : 0;
  }

  detectAnomalies(telemetryData: TelemetryData): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (telemetryData.temperature > this.getThreshold('temperature', telemetryData.component)) {
      anomalies.push({
        type: 'temperature',
        severity: (telemetryData.temperature > 90 ? 'critical' : telemetryData.temperature > 80 ? 'warning' : 'info') as any,
        component: telemetryData.component,
        value: telemetryData.temperature,
        threshold: this.getThreshold('temperature', telemetryData.component),
        recommendation: 'Immediate inspection required',
      });
    }

    const vibrationPattern = this.analyzeVibrationPattern(telemetryData.vibration);
    if (vibrationPattern.isAnomalous) {
      anomalies.push({
        type: 'vibration',
        severity: vibrationPattern.severity as any,
        component: telemetryData.component,
        pattern: vibrationPattern,
        recommendation: 'Schedule bearing inspection',
      });
    }

    if (this.isEnergyConsumptionAnomalous(telemetryData)) {
      anomalies.push({
        type: 'energy',
        severity: 'warning',
        component: telemetryData.component,
        consumption: telemetryData.energyConsumption,
        expected: this.getExpectedEnergyConsumption(telemetryData.component),
        recommendation: 'Check for electrical faults',
      });
    }

    return anomalies;
  }

  // --- Internals (stubbed heuristics for demo) ---
  private initializeModels() {
    this.mlModels.set('default', { name: 'baseline' });
  }
  private analyzeWearPattern(component: Component) {
    return { wearRate: Math.max(0.001, component.wearRate) };
  }
  private getEnvironmentalFactors() {
    return { temperature: 20, humidity: 45 };
  }
  private getUsagePattern(vehicleId: string) {
    return { dutyCycle: 0.7, avgSpeed: 85 };
  }
  private calculateFailureProbability(wear: any, env: any, usage: any) {
    const base = Math.min(0.99, wear.wearRate * 10);
    const envFactor = 1 + Math.max(0, (env.temperature - 25) / 100);
    const use = 1 + usage.dutyCycle * 0.2;
    return Math.max(0.01, Math.min(0.99, base * envFactor * use));
  }
  private calculateDaysToFailure(current: number, limit: number, wearRate: number) {
    const remaining = Math.max(0, limit - current);
    const days = wearRate > 0 ? Math.round(remaining / wearRate) : 365;
    return days;
  }
  private calculateConfidence(component: Component) {
    return Math.max(0.5, Math.min(0.95, 1 - component.wearRate / 10));
  }
  private generateRecommendation(prob: number, days: number) {
    if (prob > 0.8 || days < 14) return 'Schedule immediate inspection';
    if (prob > 0.6 || days < 30) return 'Plan maintenance within 30 days';
    return 'Monitor and re-evaluate next cycle';
  }

  private groupByMaintenanceNeeds(fleet: Vehicle[]) {
    return [
      { vehicles: fleet.map((v) => v.id).slice(0, Math.max(1, Math.floor(fleet.length / 2))) },
      { vehicles: fleet.map((v) => v.id).slice(Math.max(1, Math.floor(fleet.length / 2))) },
    ];
  }
  private findOptimalMaintenanceWindow(group: { vehicles: string[] }) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }
  private calculateGroupMaintenanceDuration(group: { vehicles: string[] }) {
    return Math.max(2, Math.min(24, group.vehicles.length * 2));
  }
  private calculateRequiredResources(group: { vehicles: string[] }) {
    return ['Technicians: ' + Math.max(2, Math.ceil(group.vehicles.length / 2)), 'Bays: ' + Math.max(1, Math.ceil(group.vehicles.length / 3))];
  }
  private calculateBatchingsSavings(group: { vehicles: string[] }) {
    return group.vehicles.length * 250; // EUR
  }
  private calculateTotalDowntime(schedule: OptimizedSchedule['schedule']) {
    return schedule.reduce((sum, s) => sum + s.estimatedDuration, 0);
  }
  private calculateTotalSavings(schedule: OptimizedSchedule['schedule']) {
    return schedule.reduce((sum, s) => sum + s.costSavings, 0);
  }
  private calculateAvailabilityImpact(schedule: OptimizedSchedule['schedule']) {
    return Math.max(0.1, Math.min(2.5, schedule.length * 0.2));
  }

  private getThreshold(kind: 'temperature' | 'vibration' | 'energy', component: string) {
    if (kind === 'temperature') return 70;
    if (kind === 'energy') return 1.3; // relative vs expected
    return 0.8; // vibration score
  }
  private analyzeVibrationPattern(arr: number[]) {
    const rms = Math.sqrt(arr.reduce((s, x) => s + x * x, 0) / Math.max(1, arr.length));
    return { isAnomalous: rms > 0.8, severity: rms > 1.2 ? 'critical' : 'warning', rms };
  }
  private isEnergyConsumptionAnomalous(t: TelemetryData) {
    const expected = this.getExpectedEnergyConsumption(t.component);
    return t.energyConsumption / expected > this.getThreshold('energy', t.component);
  }
  private getExpectedEnergyConsumption(component: string) {
    return 100; // stub baseline
  }
}
