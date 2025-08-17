import { readdirSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';

function run() {
  try {
    const dir = join(process.cwd(), '.next', 'static', 'chunks');
    const files = readdirSync(dir);
    const runtime = files.find((f) => /^webpack-.*\.js$/.test(f));
    if (!runtime) return;
    const src = join(dir, runtime);
    const targets = [
      'webpack-latest.js',
      // common stale seen in local caches during hot iterations
      'webpack-223134d250b0f0e6.js'
    ];
    for (const t of targets) {
      const dst = join(dir, t);
      if (!existsSync(dst)) copyFileSync(src, dst);
    }
    console.log('webpack fallback prepared:', runtime, '->', targets.join(', '));
  } catch (e) {
    console.error('webpack fallback prep skipped:', e?.message || String(e));
  }
}
run();
