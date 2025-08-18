export type MaintenanceStatus = 'OK' | 'DUE_SOON' | 'OVERDUE';

export interface MaintenanceTask {
  id: string;
  trainId: string;
  title: string;
  dueDate: string; // ISO
  status: MaintenanceStatus;
  depot?: string;
}

export interface Train {
  id: string;
  name: string; // z.B. RE9-780
  series?: string; // Baureihe
  depot?: string;
  lastSeen?: string;
  healthScore?: number; // 0..100
  sensors?: Array<{ key: string; value: number | string; unit?: string; ts?: string }>;
}
