#!/usr/bin/env node
// Smart verify runner with timeouts, port recovery, and artifact logging
// Node 18+/20+, ESM

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { execSync, spawn as spawnRaw } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');

const RUN_DIR = path.join(repoRoot, 'auto-iteration', 'runs', new Date().toISOString().replace(/[:.]/g, '-'));
await fsp.mkdir(RUN_DIR, { recursive: true });

const DEFAULTS = {
  API_PORT: 4100,
  WEB_PORT: 3001,
  BUILD_TIMEOUT_MS: 8 * 60_000,
  API_HEALTH_TIMEOUT_MS: 60_000,
  WEB_READY_TIMEOUT_MS: 90_000,
  DOM_SSE_TIMEOUT_MS: 45_000,
  DOM_MAP_TIMEOUT_MS: 45_000,
  TEST_TIMEOUT_MS: 6 * 60_000,
  SHUTDOWN_TIMEOUT_MS: 20_000,
};

const verifyPath = path.join(RUN_DIR, 'verify.log');
const verifyStream = fs.createWriteStream(verifyPath);
let currentPhase = 'init';
let lastHeartbeat = Date.now();
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  verifyStream.write(line + '\n');
}
function setPhase(p) {
  currentPhase = p;
  log(`PHASE ${p}`);
}
setInterval(() => {
  const line = `[${new Date().toISOString()}] HB ${currentPhase}`;
  console.log(line);
  verifyStream.write(line + '\n');
  lastHeartbeat = Date.now();
}, 5000).unref();

function spawnLogged(cmd, args, opts) {
  const child = spawn(cmd, args, { cwd: opts?.cwd || repoRoot, env: { ...process.env, ...opts?.env }, stdio: ['ignore', 'pipe', 'pipe'] });
  const outPath = path.join(RUN_DIR, opts?.logName || `${cmd}.log`);
  const outStream = fs.createWriteStream(outPath);
  child.stdout.on('data', (d) => outStream.write(d));
  child.stderr.on('data', (d) => outStream.write(d));
  child.on('exit', () => outStream.end());
  return { child, outPath };
}

function killPort(port) {
  try {
    // macOS/Linux
    execSync(`bash -lc "lsof -ti :${port} | xargs -r kill -9"`, { stdio: 'ignore' });
  } catch {}
}

async function waitForHttpOk(url, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode === 200);
          res.resume();
        });
        req.on('error', () => resolve(false));
        req.setTimeout(5000, () => { try { req.destroy(); } catch {} resolve(false); });
      });
      if (ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`${label} did not become ready within ${timeoutMs}ms`);
}

async function run() {
  const ports = { api: Number(process.env.API_PORT || DEFAULTS.API_PORT), web: Number(process.env.WEB_PORT || DEFAULTS.WEB_PORT) };

  // 1) Build
  setPhase('build');
  log('Building workspaces...');
  const envForBuild = { NEXT_PUBLIC_TEST_MODE: '1', NEXT_PUBLIC_API_BASE: `http://localhost:${ports.api}` };
  log(`Build ENV: ${JSON.stringify(envForBuild)}`);
  const build = spawnLogged('npm', ['-w', 'apps/web', 'run', 'build'], { logName: 'web-build.log', env: envForBuild });
  const buildApi = spawnLogged('npm', ['-w', 'packages/api', 'run', 'build'], { logName: 'api-build.log' });
  let timedOut = false;
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => { timedOut = true; build.child.kill('SIGKILL'); buildApi.child.kill('SIGKILL'); reject(new Error('Build timeout')); }, DEFAULTS.BUILD_TIMEOUT_MS);
    let webDone = false, apiDone = false, failed = false;
    const check = () => {
      if (failed) return;
      if (webDone && apiDone) { clearTimeout(t); resolve(); }
    };
    build.child.on('exit', (code) => { if (code !== 0) { failed = true; clearTimeout(t); reject(new Error(`Web build failed with code ${code}`)); } else { webDone = true; check(); } });
    buildApi.child.on('exit', (code) => { if (code !== 0) { failed = true; clearTimeout(t); reject(new Error(`API build failed with code ${code}`)); } else { apiDone = true; check(); } });
  });
  log('Build complete');

  // 2) Start API (production build assumed already)
  setPhase('api-start');
  log(`Starting API on port ${ports.api}...`);
  killPort(ports.api);
  const api = spawnLogged('npm', ['-w', 'packages/api', 'run', 'start:test'], { logName: 'api.log', env: { PORT: String(ports.api), TEST_MODE: '1', SEED: '42', TICK_MS: '500' } });
  setPhase('api-wait');
  await waitForHttpOk(`http://localhost:${ports.api}/health`, DEFAULTS.API_HEALTH_TIMEOUT_MS, 'API health');
  log('API is healthy');

  // 3) Start Web
  setPhase('web-start');
  log(`Starting Web on port ${ports.web}...`);
  killPort(ports.web);
  // Start Next directly to allow dynamic port
  const web = spawnLogged('node', ['node_modules/next/dist/bin/next', 'start', '-p', String(ports.web)], { logName: 'web.log', cwd: path.join(repoRoot, 'apps/web'), env: { NEXT_PUBLIC_API_BASE: `http://localhost:${ports.api}`, NEXT_PUBLIC_TEST_MODE: '1', TEST_MODE: '1', NODE_ENV: 'production' } });
  setPhase('web-wait');
  // Also watch for early exit
  let webExited = false; let webExitCode = 0;
  web.child.on('exit', (code) => { webExited = true; webExitCode = code ?? 0; });
  const start = Date.now();
  while (Date.now() - start < DEFAULTS.WEB_READY_TIMEOUT_MS) {
    if (webExited) throw new Error(`Web process exited early with code ${webExitCode}`);
    try {
      const ok = await waitForHttpOk(`http://localhost:${ports.web}/`, 2000, 'Web server poll');
      if (ok) break;
    } catch {}
  }
  // final check
  await waitForHttpOk(`http://localhost:${ports.web}/`, 5000, 'Web server');
  log('Web is serving /');

  // 3b) DOM ready (HUD signals)
  setPhase('dom-wait');
  log('Waiting for DOM ready (sse-status=connected & map-status=ready)...');
  try {
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const deadline = Date.now() + DEFAULTS.DOM_SSE_TIMEOUT_MS;
    await page.goto(`http://localhost:${ports.web}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const sse = document.querySelector('[data-testid="sse-status"]');
      return !!sse && /connected/i.test(sse.textContent || '');
    }, { timeout: Math.max(1, DEFAULTS.DOM_SSE_TIMEOUT_MS - 1000) });
    await page.waitForFunction(() => {
      const map = document.querySelector('[data-testid="map-status"]');
      return !!map && /ready/i.test(map.textContent || '');
    }, { timeout: Math.max(1, deadline - Date.now()) });
    await browser.close();
  } catch (e) {
    throw new Error(`DOM ready not reached: ${e?.message || e}`);
  }
  log('DOM ready reached');

  // 4) Run Playwright tests
  setPhase('tests');
  log('Running Playwright tests...');
  const workers = process.env.WORKERS || '1';
  const reporters = process.env.PLAYWRIGHT_HTML_REPORT === '1' ? 'list,html' : 'list';
  const tests = spawnLogged('npx', ['playwright', 'test', `--workers=${workers}`, '--retries=0', `--reporter=${reporters}`], { logName: 'tests.log', env: { NEXT_PUBLIC_TEST_MODE: '1', TEST_MODE: '1', PLAYWRIGHT_SKIP_WEBSERVER: '1' } });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => { tests.child.kill('SIGKILL'); reject(new Error('Tests timeout')); }, DEFAULTS.TEST_TIMEOUT_MS);
    tests.child.on('exit', (code) => { clearTimeout(t); code === 0 ? resolve() : reject(new Error(`Tests failed with code ${code}`)); });
  });
  log('Tests finished');

  // 4b) Promote next todo spec
  setPhase('promote');
  try {
    const promote = spawnLogged('node', ['scripts/auto/promote-next-test.mjs'], { logName: 'promote.log' });
    await new Promise((resolve) => promote.child.on('exit', () => resolve()));
    log('Promote step executed');
  } catch (e) {
    log(`Promote step failed: ${e?.message || e}`);
  }

  // 5) Shutdown
  setPhase('shutdown');
  log('Shutting down...');
  api.child.kill();
  web.child.kill();
}

run().catch(async (err) => {
  log(`ERROR ${err.message}`);
  process.exitCode = 1;
});


