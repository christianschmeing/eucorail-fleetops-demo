'use strict';

// Minimal health check script (non-destructive)
// Usage: BASE_URL=https://example.com node scripts/health-check.js

const BASE_URL = process.env.BASE_URL || process.env.URL || 'http://localhost:3001';

async function get(path) {
  try {
    const res = await fetch(BASE_URL.replace(/\/$/, '') + path);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0 };
  }
}

(async () => {
  console.log(`Health check against ${BASE_URL}`);
  const root = await get('/');
  const api = await get('/api/health');
  console.log(`  / -> ${root.status}`);
  console.log(`  /api/health -> ${api.status}`);
  if (root.ok && api.ok) {
    console.log('✅ Health OK');
    process.exit(0);
  }
  console.warn('⚠️ Health not OK');
  process.exit(1);
})();
