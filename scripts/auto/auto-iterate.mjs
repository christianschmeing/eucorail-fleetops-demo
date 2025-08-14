#!/usr/bin/env node
// Endlosschleife: verify -> (grün) promote next test -> verify -> …
// Stoppt nur, wenn auto-iteration/STOP existiert.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RUNS_DIR = 'auto-iteration/runs';
mkdirSync(RUNS_DIR, { recursive: true });

function run(cmd, args = [], env = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

function lastRunDir() {
  const items = readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()
    .reverse();
  return items[0] ? join(RUNS_DIR, items[0]) : null;
}

function summarizeFailure() {
  const dir = lastRunDir();
  if (!dir) return;
  const verifyLog = join(dir, 'verify.log');
  let summary = 'No verify.log found';
  try {
    summary = readFileSync(verifyLog, 'utf8');
  } catch {}
  writeFileSync('auto-iteration/next-fix.md',
`Letzte fehlgeschlagene Verifikation – bitte sofort beheben:\n\n-----\n${summary}\n-----\nHinweis: E2E/visuell laufen workers=1; DOM-Gates sse-status=connected, map-status=ready, train-count>=1 müssen erfüllt sein; keine leere FeatureCollection; HOLDOVER_MINUTES=5; POSITION_TICK_SEC=60; im Test-Mode nur jumpTo.\n`);
}

async function loop() {
  let i = 1;
  while (true) {
    if (existsSync('auto-iteration/STOP')) {
      console.log('STOP-Datei gefunden – Schleife beendet.');
      return;
    }
    console.log(`[auto-iterate] Iteration #${i} – verify:smart`);
    const code = await run('node', ['scripts/auto/smart-verify.mjs'], {
      PLAYWRIGHT_SKIP_WEBSERVER: '1',
      WORKERS: '1',
      NEXT_PUBLIC_TEST_MODE: '1'
    });
    if (code === 0) {
      console.log('[auto-iterate] ✅ Grün – nächste To-Do-Spec aktivieren');
      await run('node', ['scripts/auto/promote-next-test.mjs']);
      await run('git', ['add', '-A']);
      await run('git', ['commit', '-m', 'chore(auto-iterate): promote next test']);
    } else {
      console.log('[auto-iterate] ❌ Rot – Failure zusammenfassen');
      summarizeFailure();
      await new Promise(r => setTimeout(r, 15000));
    }
    i += 1;
  }
}

loop().catch((e) => { console.error(e); process.exit(1); });
