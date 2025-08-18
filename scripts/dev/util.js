import { spawn } from 'node:child_process';
import {
  mkdirSync,
  renameSync,
  existsSync,
  rmSync,
  readdirSync,
  statSync,
  readFileSync,
} from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function ensureDir(p) {
  try {
    mkdirSync(p, { recursive: true });
  } catch {}
}

export function rotateLog(p) {
  try {
    if (existsSync(p)) renameSync(p, `${p}.1`);
  } catch {}
}

export function spawnZsh(cmd, { cwd, env = {}, logFile } = {}) {
  try {
    const shell = process.platform === 'win32' ? undefined : '/bin/zsh';
    const shArgs = process.platform === 'win32' ? undefined : ['-l', '-i', '-c', cmd];
    const child = spawn(shell || cmd, shell ? shArgs : undefined, {
      cwd,
      env: { ...process.env, ...env },
      stdio: logFile ? 'ignore' : 'inherit',
      detached: true,
      shell: !!process.platform === 'win32',
    });
    child.unref();
    return child;
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('posix_spawnp')) {
      try {
        const diagOut = execCapture('node scripts/dev/diag.mjs', {
          cwd: process.cwd(),
          timeoutMs: 20000,
        });
        writeFile(
          join(process.cwd(), 'CHANGESUMMARY.md'),
          `\nposix_spawnp caught → bypass spawn; diag scheduled.\n`,
          { flag: 'a' }
        );
      } catch {}
      // naive fallback without shell
      const parts = cmd.split(' ').filter(Boolean);
      const file = parts.shift();
      const child = spawn(file, parts, {
        cwd,
        env: { ...process.env, ...env },
        stdio: logFile ? 'ignore' : 'inherit',
        detached: true,
        shell: false,
      });
      try {
        child.unref();
      } catch {}
      return child;
    }
    throw e;
  }
}

export async function httpOk(url, timeoutMs = 3000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    clearTimeout(t);
    return false;
  }
}

export async function freePort(port) {
  const cmd = `lsof -ti:${port} | xargs -r kill -9 || true`;
  try {
    spawnZsh(cmd, { cwd: process.cwd() });
  } catch {}
}

export function rmrf(path) {
  try {
    rmSync(path, { recursive: true, force: true });
  } catch {}
}

export async function runZshWait(cmd, { cwd, env = {}, timeoutMs = 480000 } = {}) {
  return new Promise((resolve) => {
    const shell = process.platform === 'win32' ? undefined : '/bin/zsh';
    const shArgs = process.platform === 'win32' ? undefined : ['-l', '-i', '-c', cmd];
    const child = spawn(shell || cmd, shell ? shArgs : undefined, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit',
      shell: !!process.platform === 'win32',
    });
    const t = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {}
      resolve({ code: -1, timeout: true });
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(t);
      resolve({ code: code ?? 0, timeout: false });
    });
  });
}

export function latestMTime(paths) {
  let latest = 0;
  for (const p of paths) {
    try {
      const st = statSync(p);
      if (st.isDirectory()) {
        const stack = [p];
        while (stack.length) {
          const d = stack.pop();
          for (const name of readdirSync(d)) {
            const fp = `${d}/${name}`;
            try {
              const st2 = statSync(fp);
              if (st2.isDirectory()) stack.push(fp);
              else latest = Math.max(latest, st2.mtimeMs);
            } catch {}
          }
        }
      } else {
        latest = Math.max(latest, st.mtimeMs);
      }
    } catch {}
  }
  return latest;
}

export function readText(p) {
  try {
    return readFileSync(p, 'utf-8');
  } catch {
    return '';
  }
}

export function spawnTunnel(opts) {
  const { token, url, binPath, logFile } = opts || {};
  if (!token && !url) return null;
  const exe = binPath || 'cloudflared';
  const base = token
    ? `${exe} tunnel run --token ${token}`
    : `${exe} tunnel --url ${url} --metrics 127.0.0.1:0`;
  const cmd = `${base} >> ${logFile} 2>&1 & echo $!`;
  return spawnZsh(cmd, { cwd: process.cwd(), logFile });
}

export async function execCapture(cmd, { cwd, timeoutMs = 120000 } = {}) {
  return new Promise((resolve) => {
    const shell = process.platform === 'win32' ? undefined : '/bin/zsh';
    const shArgs = process.platform === 'win32' ? undefined : ['-l', '-i', '-c', cmd];
    const child = spawn(shell || cmd, shell ? shArgs : undefined, {
      cwd,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: !!process.platform === 'win32',
    });
    let out = '';
    child.stdout.on('data', (d) => (out += String(d)));
    const t = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {}
      resolve({ code: -1, stdout: out, timeout: true });
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(t);
      resolve({ code: code ?? 0, stdout: out, timeout: false });
    });
  });
}

export async function httpStatus(url, timeoutMs = 4000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctl.signal, method: 'GET' });
    clearTimeout(t);
    return r.status;
  } catch {
    clearTimeout(t);
    return 0;
  }
}

export function processAlive(pid) {
  try {
    if (!pid) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeEnv(extra = {}) {
  const out = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') out[k] = v;
  }
  for (const [k, v] of Object.entries(extra)) {
    if (typeof v === 'string') out[k] = v;
  }
  if (!out.NODE_ENV) out.NODE_ENV = 'production';
  if (!out.NEXT_TELEMETRY_DISABLED) out.NEXT_TELEMETRY_DISABLED = '1';
  return out;
}

export async function writePid(file, pid) {
  try {
    await writeFile(file, String(pid));
  } catch {}
}

export function readPid(file) {
  try {
    return Number(readFileSync(file, 'utf-8').trim());
  } catch {
    return 0;
  }
}

export async function killProcGroup(pid, graceMs = 8000) {
  if (!pid) return;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {}
  }
  await sleep(graceMs);
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {}
  }
}

export async function freePortRobust(port) {
  try {
    await execCapture(`lsof -ti:${port} | xargs -r kill -9 || true`, {
      cwd: process.cwd(),
      timeoutMs: 10000,
    });
  } catch {}
  try {
    await execCapture(`fuser -k ${port}/tcp || true`, { cwd: process.cwd(), timeoutMs: 10000 });
  } catch {}
}

export function lockPath() {
  return join(process.cwd(), '.run', 'stack.lock');
}

export function readLock() {
  try {
    return JSON.parse(readFileSync(lockPath(), 'utf-8'));
  } catch {
    return null;
  }
}

export function writeLock(obj) {
  try {
    ensureDir(join(process.cwd(), '.run'));
    writeFile(lockPath(), JSON.stringify(obj, null, 2));
  } catch {}
}

export function removeLock() {
  try {
    rmSync(lockPath(), { force: true });
  } catch {}
}
