export type MaintenanceStatus = 'OK' | 'DUE_SOON' | 'OVERDUE';

export interface MaintenanceTask {
  id: string;
  trainId: string;
  title: string;
  dueDate: string; // ISO
  status: MaintenanceStatus;
  depot?: string;
}

export interface MaintenanceInterval {
  kmSinceLast: number;
  daysSinceLast: number;
  restKm: number;
  restDays: number;
  status: 'green' | 'yellow' | 'red';
  intervalKm: number;
  intervalDays: number;
  lastDate: string;
  nextDate: string;
}

export interface MaintenanceInfo {
  IS1?: MaintenanceInterval;
  IS2?: MaintenanceInterval;
  IS3?: MaintenanceInterval;
  IS4?: MaintenanceInterval;
  Lathe?: MaintenanceInterval;
}

export interface Train {
  id: string;
  name: string; // z.B. RE9-780
  series?: string; // Baureihe
  depot?: string;
  lastSeen?: string;
  healthScore?: number; // 0..100
  sensors?: Array<{ key: string; value: number | string; unit?: string; ts?: string }>;
  maintenanceInfo?: MaintenanceInfo;
  [key: string]: any; // Allow additional properties from API
}
