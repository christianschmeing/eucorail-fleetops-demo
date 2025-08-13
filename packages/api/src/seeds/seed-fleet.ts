import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type TrainSeed = {
  runId: string;
  line: 'RE9' | 'MEX16' | 'RE8';
  unitType: 'FLIRT3' | 'MIREO' | 'DESIRO_HC';
};

const fleet: TrainSeed[] = [
  { runId: 'RE9-78001', line: 'RE9', unitType: 'MIREO' },
  { runId: 'RE9-78002', line: 'RE9', unitType: 'DESIRO_HC' },
  { runId: 'RE9-78003', line: 'RE9', unitType: 'MIREO' },
  { runId: 'MEX16-66011', line: 'MEX16', unitType: 'FLIRT3' },
  { runId: 'MEX16-66012', line: 'MEX16', unitType: 'FLIRT3' },
  { runId: 'MEX16-66013', line: 'MEX16', unitType: 'FLIRT3' },
  { runId: 'RE8-79021', line: 'RE8', unitType: 'FLIRT3' },
  { runId: 'RE8-79022', line: 'RE8', unitType: 'FLIRT3' },
  { runId: 'RE8-79023', line: 'RE8', unitType: 'FLIRT3' },
  { runId: 'RE8-79024', line: 'RE8', unitType: 'FLIRT3' }
];

mkdirSync('data', { recursive: true });
writeFileSync(join('data', 'fleet.json'), JSON.stringify(fleet, null, 2));
console.log('Wrote data/fleet.json');

