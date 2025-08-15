#!/usr/bin/env node
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';

function killPorts(ports) {
  try {
    const cmd = `lsof -ti:${ports.join(',')} | xargs -r kill -9`;
    execSync(cmd, { stdio: 'ignore', shell: '/bin/bash' });
  } catch {}
}

function waitForUrl(url, timeoutMs = 60000, intervalMs = 500) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, res => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          res.resume();
          resolve(true);
        } else {
          res.resume();
          if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
          setTimeout(tick, intervalMs);
        }
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
        setTimeout(tick, intervalMs);
      });
    };
    tick();
  });
}

async function main() {
  // Free ports and build once
  killPorts([3001,3002,4100]);
  try { execSync('npm run build:all', { stdio: 'inherit' }); } catch {}

  // Start API and Web in background (prod, test-mode on)
  const api = spawn('npm', ['run', 'start:api:test'], { stdio: 'inherit', shell: false });
  const web = spawn('npm', ['run', 'start:web:test'], { stdio: 'inherit', shell: false });

  // Wait for web to be up, then open browser
  try {
    await waitForUrl('http://localhost:3001');
    // macOS open
    spawn('open', ['http://localhost:3001'], { stdio: 'ignore', detached: true }).unref();
    console.log('✅ Server bereit: http://localhost:3001');
  } catch (e) {
    console.error('⚠️ Start-Check timeout. Seite ggf. manuell öffnen: http://localhost:3001');
  }

  // Keep processes alive
  const onExit = () => { try { api.kill('SIGINT'); } catch {}; try { web.kill('SIGINT'); } catch {}; process.exit(0); };
  process.on('SIGINT', onExit);
  process.on('SIGTERM', onExit);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


