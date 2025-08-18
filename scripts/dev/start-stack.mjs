#!/usr/bin/env node
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnZsh, sleep, httpOk, ensureDir, rotateLog, freePortRobust, rmrf, runZshWait, latestMTime, readText, spawnTunnel, httpStatus, processAlive, sanitizeEnv, writePid, readPid, killProcGroup, readLock, writeLock, removeLock } from './util.js';

const repoRoot = process.cwd();
const logsRoot = existsSync('/tmp') ? '/tmp' : join(repoRoot, '.logs');
ensureDir(logsRoot);

const apiPort = Number(process.env.API_PORT || 4100);
const webPort = Number(process.env.PORT || 3002);
const apiLog = join(logsRoot, 'api.log');
const webLog = join(logsRoot, 'web.log');
rotateLog(apiLog); rotateLog(webLog);

async function start() {
  // Single-instance lock
  ensureDir(join(repoRoot, '.run'));
  const existing = readLock();
  if (existing && processAlive(existing.webPid) && processAlive(existing.apiPid)) {
    const msg = `[SKIPPED:already-running] pid_web=${existing.webPid} pid_api=${existing.apiPid}`;
    await writeFile(join(repoRoot, 'CHANGESUMMARY.md'), `\n${msg}\n`, { flag: 'a' });
    console.log(msg); return;
  }
  if (existing && (!processAlive(existing.webPid) || !processAlive(existing.apiPid))) {
    removeLock();
  }

  await Promise.all([freePortRobust(3001), freePortRobust(webPort), freePortRobust(apiPort)]);

  // API
  const apiDir = join(repoRoot, 'packages/api');
  // ensure install + build
  if (!existsSync(join(apiDir, 'node_modules/fastify'))) {
    await runZshWait('npm ci || true', { cwd: apiDir, timeoutMs: 240000 });
  }
  if (!existsSync(join(apiDir, 'dist/server.js'))) {
    await runZshWait('npm run build || true', { cwd: apiDir, timeoutMs: 240000 });
  }
  const apiCmd = `cd "${apiDir}" && PORT=${apiPort} NODE_ENV=test TEST_MODE=1 SEED=42 TICK_MS=500 node dist/server.js >> ${apiLog} 2>&1 & echo $!`;
  const apiChild = spawnZsh(apiCmd, { cwd: repoRoot, env: sanitizeEnv({ PORT: String(apiPort), NODE_ENV: 'test', TEST_MODE: '1', SEED: '42', TICK_MS: '500' }), logFile: apiLog });
  const apiPid = apiChild.pid; await writePid('/tmp/api.pid', apiPid);

  // Readiness check API
  let apiReady = false; let apiTries = 0; let apiProbe = '';
  for (const delay of [250, 500, 1000, 2000, 2000, 2000, 2000, 2000]) {
    apiTries++;
    await sleep(delay);
    if (await httpOk(`http://localhost:${apiPort}/api/health`)) { apiReady = true; apiProbe = '/api/health'; break; }
    if (await httpOk(`http://localhost:${apiPort}/api/meta/version`)) { apiReady = true; apiProbe = '/api/meta/version'; break; }
    if (await httpOk(`http://localhost:${apiPort}/api/depots`)) { apiReady = true; apiProbe = '/api/depots (soft)'; break; }
  }

  // WEB ensure fresh build
  const webDir = join(repoRoot, 'apps/web');
  const buildIdPath = join(webDir, '.next/BUILD_ID');
  const srcLatest = latestMTime([
    join(webDir, 'package.json'),
    join(webDir, 'package-lock.json'),
    join(webDir, 'next.config.mjs'),
    join(webDir, 'app'),
    join(webDir, 'components')
  ]);
  const needBuild = !existsSync(buildIdPath) || (srcLatest && srcLatest > latestMTime([buildIdPath]));
  if (needBuild) {
    rmrf(join(webDir, '.next'));
    await runZshWait('npm ci || true', { cwd: webDir, timeoutMs: 240000 });
    await runZshWait('NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build || npx --yes next build', { cwd: webDir, timeoutMs: 480000 });
  }

  let webCmd = `cd "${webDir}" && NEXT_PUBLIC_API_BASE=http://localhost:${apiPort} PORT=${webPort} npx next start -p ${webPort} -H 0.0.0.0 >> ${webLog} 2>&1 & echo $!`;
  let webChild = spawnZsh(webCmd, { cwd: repoRoot, env: sanitizeEnv({ NEXT_PUBLIC_API_BASE: `http://localhost:${apiPort}`, PORT: String(webPort) }), logFile: webLog });
  let webPid = webChild.pid; await writePid('/tmp/web.pid', webPid);

  // Readiness check WEB
  let webReady = false;
  for (const delay of [250, 500, 1000, 2000, 2000, 2000, 2000, 2000]) {
    await sleep(delay);
    if (await httpOk(`http://localhost:${webPort}/`)) { webReady = true; break; }
  }

  // Self-heal if vendor-chunks error detected
  const logTxt = readText(webLog);
  if (!webReady || /vendor-chunks|Cannot find module .*next/.test(logTxt)) {
    rmrf(join(webDir, '.next'));
    await runZshWait('NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build || npx --yes next build', { cwd: webDir, timeoutMs: 480000 });
    webCmd = `cd "${webDir}" && NEXT_PUBLIC_API_BASE=http://localhost:${apiPort} PORT=${webPort} npx next start -p ${webPort} -H 0.0.0.0 >> ${webLog} 2>&1 & echo $!`;
    webChild = spawnZsh(webCmd, { cwd: repoRoot, env: sanitizeEnv({ NEXT_PUBLIC_API_BASE: `http://localhost:${apiPort}`, PORT: String(webPort) }), logFile: webLog });
    webPid = webChild.pid;
    for (const delay of [500, 1000, 2000, 2000, 2000]) {
      await sleep(delay);
      if (await httpOk(`http://localhost:${webPort}/`)) { webReady = true; break; }
    }
  }

  const summary = [
    `API: port=${apiPort} pid=${apiPid} ready=${apiReady} probe=${apiProbe || 'none'} log=${apiLog}`,
    `WEB: port=${webPort} pid=${webPid} ready=${webReady} log=${webLog}`,
    `Open: http://localhost:${webPort}`
  ].join('\n');

  try {
    await writeFile(join(repoRoot, 'START_COMPLETE.sh'), `#!/usr/bin/env bash\n# Auto-generated\necho "${summary.replace(/"/g, '\\"')}"\n`);
  } catch {}

  try {
    await writeFile(join(repoRoot, 'CHANGESUMMARY.md'), `\n\n---\nStart Summary\n${summary}\n`, { flag: 'a' });
  } catch {}

  console.log(summary);
  writeLock({ pid: process.pid, apiPid, webPid, startedAt: Date.now() });

  // Optional stream mode
  if (process.argv.includes('--stream')) {
    const tunnelLog = join(logsRoot, 'tunnel.log'); rotateLog(tunnelLog);
    const token = process.env.CLOUDFLARE_TUNNEL_TOKEN;
    let binPath = 'cloudflared';
    if (!token) {
      // Ensure cloudflared binary exists via downloader
      try {
        const { execCapture } = await import('./util.js');
        const res = await execCapture('node scripts/dev/cloudflared.mjs', { cwd: repoRoot, timeoutMs: 180000 });
        if (res.stdout && res.stdout.trim()) binPath = res.stdout.trim();
      } catch {}
    }
    const child = spawnTunnel({ token, url: token ? undefined : `http://localhost:${webPort}`, binPath, logFile: tunnelLog });
    if (!child) {
      await writeFile(join(repoRoot, 'CHANGESUMMARY.md'), `\n[SKIPPED:tunnel-no-token] No CLOUDFLARE_TUNNEL_TOKEN and cloudflared single-url not available\n`, { flag: 'a' });
      return;
    }
    // Try to detect public URL from logs for up to ~20s
    let url = '';
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      const t = readText(tunnelLog);
      const m = t.match(/https?:\/\/[-a-zA-Z0-9_.]+\.trycloudflare\.com\b/);
      if (m) { url = m[0]; break; }
    }
    if (url) {
      const status = await httpStatus(url);
      await writeFile(join(repoRoot, 'CHANGESUMMARY.md'), `\nPreview Web: ${url} (status=${status})\n`, { flag: 'a' });
    } else {
      await writeFile(join(repoRoot, 'CHANGESUMMARY.md'), `\n[SKIPPED:tunnel-url] No tunnel URL detected\n`, { flag: 'a' });
    }
  }
}

start().catch(async (e) => {
  const msg = `Start supervisor failed: ${e?.message || e}`;
  console.error(msg);
  try { await writeFile(join(repoRoot, 'CHANGESUMMARY.md'), `\n\n[SKIPPED:start] ${msg}\n`, { flag: 'a' }); } catch {}
  process.exit(0);
});


