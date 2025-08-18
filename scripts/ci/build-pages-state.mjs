#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync, cpSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const repoRoot = process.cwd();

function appendSummary(msg) {
  try { writeFileSync(join(repoRoot, 'CHANGESUMMARY.md'), `\n${msg}\n`, { flag: 'a' }); } catch {}
}

function runNode(script) {
  return new Promise((resolve) => {
    const p = spawn('node', [script], { cwd: repoRoot, shell: false, stdio: 'ignore' });
    const to = setTimeout(() => { try { p.kill('SIGKILL'); } catch {}; resolve(false); }, 240000);
    p.on('exit', (code) => { clearTimeout(to); resolve(code === 0); });
  });
}

async function ensureState() {
  const ps = join(repoRoot, 'state', 'project-state.json');
  if (!existsSync(ps)) {
    await runNode('scripts/ci/gen-project-state.mjs');
  }
}

function writeRootRedirect(siteDir) {
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta http-equiv="refresh" content="0; url=/eucorail-fleetops-demo/state/"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Redirecting…</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;background:#0b1f2a;color:#fff;padding:2rem}a{color:#7cc}</style></head><body><h1>Redirecting…</h1><p>Open <a href="/eucorail-fleetops-demo/state/">/state/</a> for the latest preview.</p></body></html>`;
  writeFileSync(join(siteDir, 'index.html'), html);
  writeFileSync(join(siteDir, '404.html'), html);
}

async function main() {
  await ensureState();
  const siteDir = join(repoRoot, 'site');
  mkdirSync(siteDir, { recursive: true });
  writeRootRedirect(siteDir);
  // Copy state directory under site/state
  try {
    cpSync(join(repoRoot, 'state'), join(siteDir, 'state'), { recursive: true });
  } catch (e) {
    appendSummary('[SKIPPED:pages-state-copy] ' + (e?.message || String(e)));
    // still create minimal fallback
    mkdirSync(join(siteDir, 'state'), { recursive: true });
    try { writeFileSync(join(siteDir, 'state', 'index.html'), '<!doctype html><html><body><p>Preview not available yet. See project-state.json after first run.</p></body></html>'); } catch {}
  }
}

await main().catch((e) => {
  appendSummary('[SKIPPED:pages-state-build] ' + (e?.message || String(e)));
});




