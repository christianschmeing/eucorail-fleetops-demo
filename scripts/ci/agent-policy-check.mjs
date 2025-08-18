#!/usr/bin/env node
/**
 * Agent Policy Checker (warn-only, exit 0)
 * - Shell-ban: detect |, &&, ;, nohup, disown in tasks.json, package.json scripts, README.md, docs/**
 * - VS Code tasks: only type:"process"; no shell tasks
 * - README: must mention 3002/4100 and Supervisor start; must not mention 3001 as main port
 * - CI: ci.yml must not contain Playwright/UI steps
 * - Change summary: code changes without CHANGESUMMARY.md update → warn
 *
 * Outputs GitHub Annotations and a consolidated WARN block.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const warnings = [];

function warn(msg, file, line = 1) {
  warnings.push({ msg, file, line });
  const filePath = path.relative(repoRoot, file);
  console.log(`::warning file=${filePath},line=${line}::${msg}`);
}

function readIf(p) { try { return readFileSync(p, 'utf-8'); } catch { return ''; } }

function scanFilesForShellBan(files) {
  const banned = /\s(\|\||\||&&|;|nohup|disown)\s/;
  for (const f of files) {
    if (/docs\/AGENT_SYSTEM_RULES\.md$/.test(f)) continue; // allow explicit mention in rules doc
    const txt = readIf(f);
    const lines = txt.split(/\r?\n/);
    let inFence = false;
    lines.forEach((l, i) => {
      if (/^```/.test(l.trim())) { inFence = !inFence; return; }
      if (inFence) return; // ignore code fences in docs/readme
      if (banned.test(' ' + l + ' ')) warn(`Shell-ban violation: disallowed operator in ${path.basename(f)}`, f, i + 1);
    });
  }
}

function collectDocsFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = path.join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.md$/i.test(name)) out.push(p);
    }
  };
  if (statExists(dir)) walk(dir);
  return out;
}

function statExists(p) { try { return !!statSync(p); } catch { return false; } }

function main() {
  // Shell-ban across key text surfaces
  const tasksJson = path.join(repoRoot, '.vscode', 'tasks.json');
  const pkgJson = path.join(repoRoot, 'package.json');
  const readme = path.join(repoRoot, 'README.md');
  const docs = collectDocsFiles(path.join(repoRoot, 'docs'));
  scanFilesForShellBan([tasksJson, pkgJson, readme, ...docs]);

  // VS Code tasks type=process only
  try {
    const tasks = JSON.parse(readIf(tasksJson));
    const arr = Array.isArray(tasks?.tasks) ? tasks.tasks : [];
    for (const t of arr) {
      if (t?.type && String(t.type) !== 'process') {
        warn(`VS Code task '${t.label || '<unnamed>'}' must use type:"process"`, tasksJson, 1);
      }
    }
  } catch {}

  // README checks
  const readmeTxt = readIf(readme);
  if (!/http:\/\/localhost:3002/.test(readmeTxt)) warn('README should mention Web at http://localhost:3002', readme, 1);
  if (!/http:\/\/localhost:4100/.test(readmeTxt)) warn('README should mention API at http://localhost:4100', readme, 1);
  if (!/(start-stack\.mjs|dev:stack|Supervisor)/i.test(readmeTxt)) warn('README should instruct start via Supervisor (scripts/dev/start-stack.mjs or npm run dev:stack)', readme, 1);
  if (/localhost:3001/.test(readmeTxt)) warn('README should not promote :3001 as primary; use :3002 Supervisor', readme, 1);

  // CI Playwright/UI ban for internal ci.yml
  const ciYml = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
  const ciTxt = readIf(ciYml);
  if (/playwright|test:e2e|--ui/i.test(ciTxt)) warn('CI workflow should not run Playwright/UI steps', ciYml, 1);

  // CHANGESUMMARY updated when code changes present
  const gitDiff = readIfExec('git diff --name-only HEAD~1..HEAD');
  if (gitDiff) {
    const changed = gitDiff.split('\n').filter(Boolean);
    const codeChanged = changed.some(f => /\.(ts|tsx|js|mjs|css|md|json)$/i.test(f) && !/^CHANGESUMMARY\.md$/i.test(path.basename(f)));
    const changesSummaryUpdated = changed.includes('CHANGESUMMARY.md');
    if (codeChanged && !changesSummaryUpdated) warn('Code changed without CHANGESUMMARY.md update', repoRoot, 1);
  }

  // Final warn block
  if (warnings.length) {
    console.log('\n\n🟠 Agent Policy Warnings');
    for (const w of warnings) console.log('- ' + w.msg);
  } else {
    console.log('Agent policy check: OK');
  }
  process.exit(0);
}

function readIfExec(cmd) {
  try {
    const { execSync } = require('node:child_process');
    return execSync(cmd, { encoding: 'utf-8' }).trim();
  } catch { return ''; }
}

main();


