#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function appendSummary(msg) {
  try { writeFileSync(path.join(repoRoot, 'CHANGESUMMARY.md'), `\n${msg}\n`, { flag: 'a' }); } catch {}
}

try {
  const rulesPath = path.join(repoRoot, 'docs', 'AGENT_SYSTEM_RULES.md');
  const seedPath = path.join(repoRoot, '.agent', 'SEED.prompt');
  const rules = readFileSync(rulesPath, 'utf-8');
  const seed = readFileSync(seedPath, 'utf-8');
  const header = '=== Agent Operating Manual (Rules + Seed) ===\n';
  const out = [header, '\n--- RULES ---\n', rules.trim(), '\n\n--- SEED (copy & paste) ---\n', seed.trim(), '\n'].join('');
  process.stdout.write(out);
} catch (e) {
  appendSummary(`[SKIPPED:show-rules] ${e?.message || String(e)}`);
  process.stdout.write('Rules or Seed not found.\n');
}




