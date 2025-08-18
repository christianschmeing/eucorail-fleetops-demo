#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function safe(cmd) { try { return execSync(cmd, { encoding: 'utf-8' }).trim(); } catch { return ''; } }
function tail(p) { try { const t = readFileSync(p,'utf-8').split('\n'); return t.slice(-200).join('\n'); } catch { return ''; } }

const logsRoot = existsSync('/tmp') ? '/tmp' : join(process.cwd(), '.logs');
const outDir = join(process.cwd(), '.logs');
try { mkdirSync(outDir,{recursive:true}); } catch {}
const diag = {
  ts: new Date().toISOString(),
  os: safe('uname -a') || process.platform,
  node: process.version,
  npm: safe('npm -v'),
  next: safe('npm ls next --depth=0 2>/dev/null'),
  ports: {
    '3002': safe('lsof -i :3002 -P -n | head -n 5'),
    '4100': safe('lsof -i :4100 -P -n | head -n 5')
  },
  logs: {
    api: tail(join(logsRoot, 'api.log')),
    web: tail(join(logsRoot, 'web.log')),
    tunnel: tail(join(logsRoot, 'tunnel.log')),
  },
  lock: (function(){ try { return JSON.parse(readFileSync(join(process.cwd(), '.run', 'stack.lock'),'utf-8')); } catch { return null; } })()
};

const file = join(outDir, `diag-${Date.now()}.json`);
writeFileSync(file, JSON.stringify(diag,null,2));
console.log(file);




