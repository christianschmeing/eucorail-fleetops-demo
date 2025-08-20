// ECM-konforme Wartungsprofile (vereinfachte Erstintegration)
export const ECM_PROFILES = {
  FLIRT3: {
    IS1: { periodDays: 7, periodKm: 5000, durationHours: 1.5 },
    IS2: { periodDays: 45, periodKm: 30000, durationHours: 4.0 },
    IS3: { periodDays: 180, periodKm: 100000, durationHours: 8.0 },
    IS4: { periodDays: 730, periodKm: 400000, durationHours: 16.0 },
    WHEEL_LATHE: { periodKm: 150000, durationHours: 6.0, location: 'GAB' },
  },
  MIREO: {
    IS1: { periodDays: 7, periodKm: 6000, durationHours: 1.7 },
    IS2: { periodDays: 40, periodKm: 35000, durationHours: 4.5 },
    IS3: { periodDays: 150, periodKm: 120000, durationHours: 8.5 },
    IS4: { periodDays: 730, periodKm: 500000, durationHours: 18.0 },
    WHEEL_LATHE: { periodKm: 180000, durationHours: 6.5, location: 'GAB' },
  },
  DESIRO_HC: {
    IS1: { periodDays: 7, periodKm: 5500, durationHours: 1.5 },
    IS2: { periodDays: 50, periodKm: 40000, durationHours: 4.5 },
    IS3: { periodDays: 200, periodKm: 140000, durationHours: 9.0 },
    IS4: { periodDays: 1095, periodKm: 600000, durationHours: 20.0 },
    WHEEL_LATHE: { periodKm: 200000, durationHours: 7.0, location: 'GAB' },
  },
} as const;

export const FAILURE_RATES_PER_10K_KM = {
  common: { traction: 0.15, doors: 0.6, hvac: 0.25, brakes: 0.2, tcms: 0.1, pantograph: 0.08 },
  specific: {
    DESIRO_HC: { doors: 0.66, stairs: 0.05 },
    MIREO: { coupling: 0.03 },
  },
} as const;
