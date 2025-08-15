#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const workspace = process.argv[2] || 'apps/web';
const serverDir = path.join(process.cwd(), workspace, '.next', 'server');
const chunksDir = path.join(serverDir, 'chunks');

function ensureSymlinksOnce() {
  if (!fs.existsSync(chunksDir) || !fs.existsSync(serverDir)) return;
  const files = fs.readdirSync(chunksDir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const src = path.join(chunksDir, f);
    const dest = path.join(serverDir, f);
    try {
      if (!fs.existsSync(dest)) {
        fs.symlinkSync(path.relative(serverDir, src), dest);
        console.log(`[patch-next] linked ${f}`);
      }
    } catch (e) {
      // ignore
    }
  }
}

function watch() {
  try {
    fs.mkdirSync(path.dirname(chunksDir), { recursive: true });
  } catch {}
  ensureSymlinksOnce();
  if (!fs.existsSync(chunksDir)) return;
  fs.watch(chunksDir, { persistent: true }, (_event, filename) => {
    if (!filename || !filename.endsWith('.js')) return;
    ensureSymlinksOnce();
  });
}

if (process.argv.includes('--watch')) {
  watch();
} else {
  ensureSymlinksOnce();
}


