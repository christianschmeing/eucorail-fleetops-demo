import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { FastifySSEPlugin } from 'fastify-sse-v2';
import { readFileSync } from 'node:fs';

// Environment-driven test mode configuration
const TEST_MODE = process.env.TEST_MODE === '1' || process.env.NODE_ENV === 'test';
const DEFAULT_SEED = Number(process.env.SEED ?? 42);
const TICK_MS = Number(process.env.TICK_MS ?? 500);

// Fleet data loaded once
type FleetItem = { runId: string; line: string };
let FLEET: FleetItem[] = [];
try {
  FLEET = JSON.parse(readFileSync('data/fleet.json', 'utf-8')) as FleetItem[];
} catch {
  FLEET = [];
}

// Deterministic PRNG (Mulberry32)
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simple hash for per-train seeds
function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const bboxByLine: Record<string, [number, number, number, number]> = {
  RE9: [10.05, 48.30, 10.97, 48.60],
  MEX16: [9.10, 48.65, 10.05, 48.75],
  RE8: [9.05, 48.70, 10.00, 49.90],
  BY: [10.0, 48.3, 12.0, 49.2],
  BW: [8.5, 48.4, 9.9, 49.1]
};

// In TEST_MODE produce a deterministic, non-moving snapshot based on SEED
function getDeterministicSnapshot(seed: number) {
  const features = FLEET.map((t) => {
    const [minLon, minLat, maxLon, maxLat] = bboxByLine[t.line] || [9.0, 48.5, 11.5, 50.0];
    const prng = mulberry32(seed ^ hashString(t.runId));
    const lon = minLon + prng() * (maxLon - minLon);
    const lat = minLat + prng() * (maxLat - minLat);
    return {
      type: 'Feature',
      properties: {
        id: t.runId,
        line: t.line,
        status: 'active',
        speed: 0,
        ts: Date.now()
      },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    } as const;
  });
  return { type: 'FeatureCollection', features } as const;
}

function getNonDeterministicSnapshot() {
  const features = FLEET.map((t) => {
    const [minLon, minLat, maxLon, maxLat] = bboxByLine[t.line] || [9.0, 48.5, 11.5, 50.0];
    const lon = minLon + Math.random() * (maxLon - minLon);
    const lat = minLat + Math.random() * (maxLat - minLat);
    return {
      type: 'Feature',
      properties: {
        id: t.runId,
        line: t.line,
        status: 'active',
        speed: Math.round(80 + Math.random() * 40),
        ts: Date.now()
      },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    } as const;
  });
  return { type: 'FeatureCollection', features } as const;
}

export default fp(async (app: FastifyInstance) => {
  await app.register(FastifySSEPlugin);
  const HEARTBEAT_MS = 15000;

  // Optional testing reset endpoint
  if (TEST_MODE) {
    app.post('/testing/reset', async (_req, reply) => {
      currentSeed = DEFAULT_SEED;
      reply.send({ ok: true });
    });
  }

  app.get('/events', async (req, reply) => {
    // Explicit SSE headers incl. CORS for direct connections
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    const lastId = (req.headers['last-event-id'] as string) ?? '0';
    reply.sse({ id: lastId, event: 'ping', data: 'ready' });

    const updateTimer = setInterval(() => {
      const payload = TEST_MODE ? getDeterministicSnapshot(currentSeed) : getNonDeterministicSnapshot();
      reply.sse({ event: 'train:update', data: JSON.stringify(payload) });
    }, TICK_MS);

    const hbTimer = setInterval(() => {
      reply.sse({ event: 'hb', data: Date.now().toString() });
    }, HEARTBEAT_MS);

    req.raw.on('close', () => {
      clearInterval(updateTimer);
      clearInterval(hbTimer);
    });
  });
});

let currentSeed = DEFAULT_SEED;


