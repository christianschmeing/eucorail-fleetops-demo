export const schedules = {
  RE9: [
    { station: 'Ulm Hbf', time: '07:32', lat: 48.3994, lon: 9.9829 },
    { station: 'Günzburg', time: '07:45', lat: 48.4556, lon: 10.2777 },
    { station: 'Augsburg Hbf', time: '08:47', lat: 48.3651, lon: 10.8855 }
  ],
  MEX16: [
    { station: 'Stuttgart Hbf', time: '06:15', lat: 48.7836, lon: 9.1816 },
    { station: 'Göppingen', time: '06:45', lat: 48.7055, lon: 9.6520 },
    { station: 'Ulm Hbf', time: '07:30', lat: 48.3994, lon: 9.9829 }
  ]
} as const;

export type ScheduleKey = keyof typeof schedules;
export type ScheduleStop = (typeof schedules)[ScheduleKey][number];


