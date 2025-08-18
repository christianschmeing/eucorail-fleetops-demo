import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type LineSeed = {
  id: string;
  name: string;
  code: 'RE9' | 'MEX16' | 'RE8';
  bbox: [number, number, number, number];
};

const seeds: LineSeed[] = [
  { id: 're9', name: 'RE9 Ulm–Augsburg', code: 'RE9', bbox: [10.05, 48.3, 10.97, 48.6] },
  { id: 'mex16', name: 'MEX16 Stuttgart–Ulm', code: 'MEX16', bbox: [9.1, 48.65, 10.05, 48.75] },
  { id: 're8', name: 'RE8 Stuttgart–Würzburg', code: 'RE8', bbox: [9.05, 48.7, 10.0, 49.9] },
];

mkdirSync('data', { recursive: true });
writeFileSync(join('data', 'lines.json'), JSON.stringify(seeds, null, 2));
console.log('Wrote data/lines.json');
