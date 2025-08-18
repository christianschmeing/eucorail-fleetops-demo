#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync, chmodSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

const BIN_DIR = join(process.cwd(), '.bin');
const OUT = join(BIN_DIR, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');

function archTag() {
  const arch = process.arch;
  const platform = process.platform;
  if (platform === 'darwin') return arch === 'arm64' ? 'darwin-arm64' : 'darwin-amd64';
  if (platform === 'linux') return arch === 'arm64' ? 'linux-arm64' : 'linux-amd64';
  if (platform === 'win32') return arch === 'arm64' ? 'windows-arm64' : 'windows-amd64';
  return 'linux-amd64';
}

async function sha256Of(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const hash = createHash('sha256');
      const fs = require('node:fs');
      const s = fs.createReadStream(filePath);
      s.on('data', (d) => hash.update(d));
      s.on('end', () => resolve(hash.digest('hex')));
      s.on('error', reject);
    } catch (e) { reject(e); }
  });
}

async function main() {
  try { mkdirSync(BIN_DIR, { recursive: true }); } catch {}
  const tag = archTag();
  const base = 'https://github.com/cloudflare/cloudflared/releases/latest/download';
  const url = `${base}/cloudflared-${tag}`;
  const expectedShaUrl = `${url}.sha256`;
  let expected = '';
  try {
    const r = await fetch(expectedShaUrl);
    if (r.ok) expected = (await r.text()).trim().split(/\s+/)[0];
  } catch {}
  if (existsSync(OUT) && expected) {
    try {
      const got = await sha256Of(OUT);
      if (got === expected) {
        console.log(OUT);
        return;
      }
    } catch {}
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const ws = createWriteStream(OUT);
    await pipeline(res.body, ws);
    if (process.platform !== 'win32') chmodSync(OUT, 0o755);
    console.log(OUT);
  } catch (e) {
    console.error('[SKIPPED:cloudflared-download]', e.message);
    process.exit(0);
  }
}

await main();




