import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

async function run() {
  const apiPort = 4100;
  const webPort = 3001;

  console.log('🧹 Cleaning up...');
  try { rmSync('apps/web/.next', { recursive: true, force: true }); } catch {}

  console.log('🌱 Seeding data...');
  const seedLines = spawn('npm', ['run', 'seed:lines'], { stdio: 'inherit', shell: true });
  await new Promise((res) => seedLines.on('exit', res));
  
  const seedFleet = spawn('npm', ['run', 'seed:fleet'], { stdio: 'inherit', shell: true });
  await new Promise((res) => seedFleet.on('exit', res));

  console.log('🚀 Starting API on port', apiPort);
  const api = spawn('npm', ['--workspace', 'packages/api', 'run', 'dev'], {
    env: { ...process.env, PORT: String(apiPort) },
    stdio: 'inherit',
    shell: true
  });

  // Wait for API to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('🌐 Starting Web on port', webPort);
  const web = spawn('npm', ['--workspace', 'apps/web', 'run', 'dev', '--', '-p', String(webPort)], {
    env: { 
      ...process.env, 
      NEXT_PUBLIC_API_BASE: `http://localhost:${apiPort}`,
      API_ORIGIN: `http://localhost:${apiPort}`
    },
    stdio: 'inherit',
    shell: true
  });

  process.on('SIGINT', () => { 
    api.kill('SIGTERM'); 
    web.kill('SIGTERM'); 
    process.exit(0); 
  });

  console.log(`
╔═══════════════════════════════════════╗
║   Eucorail FleetOps Demo              ║
╠═══════════════════════════════════════╣
║   Web: http://localhost:${webPort}         ║
║   API: http://localhost:${apiPort}         ║
╚═══════════════════════════════════════╝
  `);
}

run().catch(console.error);

