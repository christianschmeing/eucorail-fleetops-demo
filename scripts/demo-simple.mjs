import { spawn, spawnSync } from 'child_process';
import { rmSync } from 'node:fs';

console.log('🚀 Starting Eucorail FleetOps Demo (Simple)...');

// Clean caches and kill ports via existing stop script
console.log('🛑 Cleaning up...');
try { rmSync('apps/web/.next', { recursive: true, force: true }); } catch {}
spawnSync('node', ['scripts/stop.mjs'], { stdio: 'inherit', shell: true });

console.log('🌱 Running seeds...');
const seedLines = spawnSync('npm', ['run', 'seed:lines'], { stdio: 'inherit', shell: true });
if (seedLines.status !== 0) process.exit(seedLines.status ?? 1);
const seedFleet = spawnSync('npm', ['run', 'seed:fleet'], { stdio: 'inherit', shell: true });
if (seedFleet.status !== 0) process.exit(seedFleet.status ?? 1);
console.log('✅ Seeds completed');

console.log('🔧 Starting API server...');
const api = spawn('npm', ['--workspace', 'packages/api', 'run', 'dev'], {
  env: { ...process.env, PORT: '4100' },
  stdio: 'inherit',
  shell: true
});

setTimeout(() => {
  console.log('🌐 Starting Web server...');
  const web = spawn('npm', ['--workspace', 'apps/web', 'run', 'dev', '--', '-p', '3001'], {
    env: { ...process.env, PORT: '3001' },
    stdio: 'inherit',
    shell: true
  });

  console.log('🎉 Demo starting...');
  console.log('🌐 Web: http://localhost:3001');
  console.log('🔧 API: http://localhost:4100');

  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping demo...');
    api.kill('SIGKILL');
    web.kill('SIGKILL');
    process.exit(0);
  });
}, 1200);


