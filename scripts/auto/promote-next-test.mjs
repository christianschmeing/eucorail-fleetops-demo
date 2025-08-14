#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const todoDir = path.join(repoRoot, 'tests', 'todo');
const e2eDir = path.join(repoRoot, 'tests', 'e2e');

async function main() {
  try {
    await fs.mkdir(todoDir, { recursive: true });
    await fs.mkdir(e2eDir, { recursive: true });
    const files = (await fs.readdir(todoDir)).filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).sort();
    if (files.length === 0) {
      console.log('No todo specs to promote.');
      return;
    }
    const next = files[0];
    const src = path.join(todoDir, next);
    const dst = path.join(e2eDir, next);
    let content = await fs.readFile(src, 'utf-8');
    content = content.replace(/test\.skip\(/g, 'test(');
    await fs.writeFile(dst, content, 'utf-8');
    await fs.rm(src);
    console.log(`Promoted ${next} to e2e/`);
  } catch (e) {
    console.error('promote-next-test failed:', e.message);
    process.exitCode = 1;
  }
}

main();


