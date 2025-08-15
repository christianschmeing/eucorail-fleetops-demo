import { execSync } from 'node:child_process';

function killPort(port) {
  try {
    const output = execSync(`lsof -ti tcp:${port}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const pids = output
      .split(/\s+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (pids.length === 0) return;
    execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'inherit' });
    console.log(`Killed processes on port ${port}`);
  } catch {}
}

// Kill both IPv4/IPv6 listeners if any, and repeat once for stragglers
[3000, 3001, 4100].forEach(killPort);
setTimeout(() => {
  [3000, 3001, 4100].forEach(killPort);
  console.log('Stop complete.');
}, 200);

