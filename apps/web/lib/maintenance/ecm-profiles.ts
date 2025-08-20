// ECM-konforme Wartungsprofile (vereinfachte Erstintegration)
// Canonical mapping: IS1..IS6 ↔ DB F1..F6, codes and typical intervals
export const INTERVENTION_MAPPING = {
  naming_scheme: 'IS1_to_IS6',
  description: 'Interne Stufen IS1..IS6 mappen 1:1 auf F1..F6 der DB.',
  mapping: {
    IS1: {
      maps_to: 'F1',
      db_is_codes: [510, 517],
      typical_interval: { km: [20000, 30000], timeDays: '6–8 Wochen' },
    },
    IS2: {
      maps_to: 'F2',
      db_is_codes: [520, 527],
      typical_interval: { km: [60000, 90000], timeDays: '3–6 Monate' },
    },
    IS3: {
      maps_to: 'F3',
      db_is_codes: [530],
      typical_interval: { km: [180000, 240000], timeDays: '≈12 Monate' },
    },
    IS4: {
      maps_to: 'F4',
      db_is_codes: [540],
      typical_interval: { km: [480000, 600000], timeDays: '2–3 Jahre' },
    },
    IS5: {
      maps_to: 'F5',
      db_is_codes: [550],
      typical_interval: { km: [1000000, 1200000], timeDays: '6 Jahre (mit HU)' },
    },
    IS6: {
      maps_to: 'F6',
      db_is_codes: [550],
      typical_interval: { km: [1200000], timeDays: 'bis 8 Jahre (verlängerter HU-Zyklus)' },
    },
  },
  auxiliary: {
    inspections: {
      IS100: 'Zuginspektion',
      IS170: 'ZI ohne Grube',
      IS180: 'ZI mit erhöhtem Aufwand',
      IS200: 'Nachschau',
    },
    brakes: { IS560: 'Br 1.1/1.2', IS580: 'Br 2', IS590: 'Br 3' },
    corrective: {
      IS010: 'außerplanm. leicht',
      IS020: 'außerplanm. leicht',
      IS030: 'Bedarfsreparatur',
      IS031: 'mobil',
      IS040: 'Schäden Dritte',
      IS043: 'Graffiti',
      IS090: 'schwere Unfallschäden',
    },
    revisions: {
      IS600: 'EBO-Untersuchung reduziert',
      IS630: 'zustandsbezogene HU',
      IS670: 'erste Revision',
      IS680: 'vereinfachte Revision',
      IS700: 'Revision o. Lack',
      IS703: 'Revision m. Lack',
      IS710: 'modulare Instandhaltung',
      IS660: 'Auslaufuntersuchung',
    },
  },
  notes: ['HU-Pflicht: alle 6 Jahre; verlängerbar auf max. 8 Jahre je Zustand (EBO).'],
} as const;

// Vehicle-family specific numeric planning baselines (approx. medians from typical intervals)
export const ECM_PROFILES = {
  FLIRT3: {
    IS1: { periodDays: 56, periodKm: 25000, durationHours: 2.0 },
    IS2: { periodDays: 150, periodKm: 75000, durationHours: 6.0 },
    IS3: { periodDays: 365, periodKm: 210000, durationHours: 16.0 },
    IS4: { periodDays: 913, periodKm: 540000, durationHours: 32.0 },
    IS5: { periodDays: 2190, periodKm: 1100000, durationHours: 64.0 },
    IS6: { periodDays: 2920, periodKm: 1300000, durationHours: 72.0 },
    WHEEL_LATHE: { periodKm: 150000, durationHours: 6.0, location: 'GAB' },
  },
  MIREO: {
    IS1: { periodDays: 56, periodKm: 25000, durationHours: 2.0 },
    IS2: { periodDays: 150, periodKm: 75000, durationHours: 6.0 },
    IS3: { periodDays: 365, periodKm: 210000, durationHours: 16.0 },
    IS4: { periodDays: 913, periodKm: 540000, durationHours: 32.0 },
    IS5: { periodDays: 2190, periodKm: 1100000, durationHours: 64.0 },
    IS6: { periodDays: 2920, periodKm: 1300000, durationHours: 72.0 },
    WHEEL_LATHE: { periodKm: 180000, durationHours: 6.5, location: 'GAB' },
  },
  DESIRO_HC: {
    IS1: { periodDays: 56, periodKm: 25000, durationHours: 2.0 },
    IS2: { periodDays: 150, periodKm: 75000, durationHours: 6.0 },
    IS3: { periodDays: 365, periodKm: 210000, durationHours: 18.0 },
    IS4: { periodDays: 913, periodKm: 540000, durationHours: 36.0 },
    IS5: { periodDays: 2190, periodKm: 1100000, durationHours: 68.0 },
    IS6: { periodDays: 2920, periodKm: 1300000, durationHours: 76.0 },
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
