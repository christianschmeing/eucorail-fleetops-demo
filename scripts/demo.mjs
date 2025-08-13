import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { rmSync } from 'node:fs';

async function findAvailablePort(start) {
  let candidate = start;
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const free = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(null));
      server.listen(candidate, () => {
        const { port } = server.address();
        server.close(() => resolve(port));
      });
    });
    if (free) return free;
    candidate += 1;
  }
}

async function run() {
  const apiPort = await findAvailablePort(4100);
  // Force web to start from 3001 to avoid 3000 collisions in local envs
  const webPort = 3001;

  try { rmSync('apps/web/.next', { recursive: true, force: true }); } catch {}

  const seedLines = spawn('npm', ['run', 'seed:lines'], { stdio: 'inherit', shell: true });
  await new Promise((res, rej) => seedLines.on('exit', (c) => (c === 0 ? res() : rej(new Error('seed:lines failed')))));
  const seedFleet = spawn('npm', ['run', 'seed:fleet'], { stdio: 'inherit', shell: true });
  await new Promise((res, rej) => seedFleet.on('exit', (c) => (c === 0 ? res() : rej(new Error('seed:fleet failed')))));

  const api = spawn('npm', ['--workspace', 'packages/api', 'run', 'dev'], {
    env: { ...process.env, PORT: String(apiPort) },
    stdio: 'inherit',
    shell: true
  });

  const web = spawn('npm', ['--workspace', 'apps/web', 'run', 'dev', '--', '-p', String(webPort)], {
    env: { ...process.env, API_ORIGIN: `http://localhost:${apiPort}` },
    stdio: 'inherit',
    shell: true
  });

  process.on('SIGINT', () => { api.kill('SIGINT'); web.kill('SIGINT'); process.exit(0); });
  process.on('SIGTERM', () => { api.kill('SIGTERM'); web.kill('SIGTERM'); process.exit(0); });

  console.log(`Web: http://localhost:${webPort}  API: http://localhost:${apiPort}`);
}

run().catch((e) => { console.error(e); process.exit(1); });

