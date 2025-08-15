#!/usr/bin/env node
import { spawn } from 'node:child_process';

const [, , timeoutSecStr, ...cmdParts] = process.argv;
const timeoutSec = Number(timeoutSecStr || 300);
const cmd = cmdParts.join(' ');

const child = spawn(cmd, { shell: true, stdio: 'inherit' });
const timer = setTimeout(() => {
  console.error(`[TIMEOUT/SKIP] ${cmd} -> exceeded ${timeoutSec}s, killing`);
  try { child.kill('SIGTERM'); } catch {}
}, timeoutSec * 1000);

child.on('exit', (code, signal) => {
  clearTimeout(timer);
  if (signal === 'SIGTERM') {
    process.exit(0);
  } else {
    process.exit(code ?? 0);
  }
});


