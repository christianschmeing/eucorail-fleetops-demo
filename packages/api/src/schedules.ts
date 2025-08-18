export const schedules = {
  RE9: [
    { station: 'Ulm Hbf', time: '07:32', lat: 48.3994, lon: 9.9829 },
    { station: 'Günzburg', time: '07:45', lat: 48.4556, lon: 10.2777 },
    { station: 'Augsburg Hbf', time: '08:47', lat: 48.3651, lon: 10.8855 },
  ],
  MEX16: [
    { station: 'Stuttgart Hbf', time: '06:15', lat: 48.7836, lon: 9.1816 },
    { station: 'Göppingen', time: '06:45', lat: 48.7055, lon: 9.652 },
    { station: 'Ulm Hbf', time: '07:30', lat: 48.3994, lon: 9.9829 },
  ],
  RE7: [
    { station: 'Stuttgart Hbf', time: '06:10', lat: 48.7836, lon: 9.1816 },
    { station: 'Böblingen', time: '06:35', lat: 48.682, lon: 9.011 },
    { station: 'Tübingen Hbf', time: '06:55', lat: 48.5216, lon: 9.0522 },
  ],
  RE10: [
    { station: 'Nürnberg Hbf', time: '07:05', lat: 49.4521, lon: 11.077 },
    { station: 'Allersberg', time: '07:32', lat: 49.25, lon: 11.35 },
    { station: 'Ingolstadt Hbf', time: '08:05', lat: 48.765, lon: 11.425 },
  ],
  MEX14: [
    { station: 'München Hbf', time: '07:15', lat: 48.1402, lon: 11.561 },
    { station: 'Murnau', time: '07:55', lat: 47.6842, lon: 11.2056 },
    { station: 'Garmisch-Partenkirchen', time: '08:25', lat: 47.492, lon: 11.11 },
  ],
  MEX15: [
    { station: 'München Hbf', time: '06:45', lat: 48.1402, lon: 11.561 },
    { station: 'Grafing', time: '07:05', lat: 48.046, lon: 11.967 },
    { station: 'Rosenheim', time: '07:35', lat: 47.8564, lon: 12.1241 },
  ],
} as const;

export type ScheduleKey = keyof typeof schedules;
export type ScheduleStop = (typeof schedules)[ScheduleKey][number];
