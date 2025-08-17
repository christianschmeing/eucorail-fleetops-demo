import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { FastifySSEPlugin } from 'fastify-sse-v2';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RealisticTrainPhysics } from '../simulation/physics.js';
import { WeatherService } from '../weather/index.js';
import { EnergyMonitor } from '../energy/monitor.js';
import { PassengerSimulator } from '../passengers/simulator.js';
import { schedules } from '../schedules.js';
import { railPolylineByLine } from './rail.js';

// Environment-driven test mode configuration
const TEST_MODE = process.env.TEST_MODE === '1' || process.env.NODE_ENV === 'test';
const DEFAULT_SEED = Number(process.env.SEED ?? 42);
const TICK_MS = Number(process.env.TICK_MS ?? 500);

// Fleet data loaded once
type FleetItem = { runId: string; line: string };

function computeFleetFromSeeds(): FleetItem[] {
  try {
    const p = path.join(process.cwd(), 'seeds', 'averio', 'trains.json');
    const trains = JSON.parse(readFileSync(p, 'utf-8')) as Array<any>;

    const TARGETS: Record<string, { count: number; prefix: string; base: number }> = {
      MEX16: { count: 66, prefix: 'MEX16-66', base: 1 },
      RE8: { count: 39, prefix: 'RE8-79', base: 1 },
      RE9: { count: 39, prefix: 'RE9-78', base: 1 }
    };

    const byLine: Record<string, any[]> = {};
    for (const t of trains) {
      const key = String(t.lineId || t.line || 'UNKNOWN').toUpperCase();
      (byLine[key] ||= []).push(t);
    }

    function pad3(n: number): string { return String(n).padStart(3, '0'); }

    for (const [lineId, target] of Object.entries(TARGETS)) {
      const current = byLine[lineId]?.length ?? 0;
      if (current < target.count) {
        byLine[lineId] ||= [];
        for (let i = current; i < target.count; i++) {
          const runId = `${target.prefix}${pad3(i + 1)}`;
          byLine[lineId].push({ id: runId, lineId });
        }
      }
    }

    const full = Object.entries(byLine)
      .filter(([id]) => id in TARGETS)
      .flatMap(([line, list]) => list.map((t) => ({ runId: String(t.id), line })));

    return full;
  } catch {
    return [];
  }
}

const DEMO_SYNTH = process.env.DEMO_SYNTHETIC_COUNTS === '1';
let FLEET: FleetItem[] = computeFleetFromSeeds();

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

// Simple haversine distance in meters
function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number { return (deg * Math.PI) / 180; }
function toDeg(rad: number): number { return (rad * 180) / Math.PI; }
function bearingDegrees(from: [number, number], to: [number, number]): number {
  const lon1 = toRad(from[0]);
  const lat1 = toRad(from[1]);
  const lon2 = toRad(to[0]);
  const lat2 = toRad(to[1]);
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  const brng = Math.atan2(y, x);
  return (toDeg(brng) + 360) % 360;
}
function destinationPoint(start: [number, number], bearingDeg: number, distanceM: number): [number, number] {
  const R = 6371000;
  const δ = distanceM / R;
  const θ = toRad(bearingDeg);
  const λ1 = toRad(start[0]);
  const φ1 = toRad(start[1]);
  const sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ), cosδ = Math.cos(δ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);
  return [((toDeg(λ2) + 540) % 360) - 180, toDeg(φ2)];
}

// Physics + weather instances and per-train state
const physics = new RealisticTrainPhysics();
const weatherService = new WeatherService();
const trainStartMs = new Map<string, number>();
const lastSpeedKmh = new Map<string, number>();
const energyMonitor = new EnergyMonitor();
const paxSimByTrain = new Map<string, PassengerSimulator>();
const trainPosById = new Map<string, [number, number]>();
const trainSegIdxById = new Map<string, number>();
const trainDwellMsById = new Map<string, number>();

function distanceToNearestStation(line: string, lon: number, lat: number): number {
  const list = (schedules as any)[line] as Array<{ lat: number; lon: number }> | undefined;
  if (!list || list.length === 0) return 2000; // fallback
  let best = Number.POSITIVE_INFINITY;
  for (const stop of list) {
    const d = haversineMeters([lon, lat], [stop.lon, stop.lat]);
    if (d < best) best = d;
  }
  return best;
}

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
  const now = Date.now();
  const weatherNow = weatherService.getCurrentWeather();
  const speedMod = weatherService.getSpeedModifier(weatherNow);
  const features = FLEET.map((t) => {
    const [minLon, minLat, maxLon, maxLat] = bboxByLine[t.line] || [9.0, 48.5, 11.5, 50.0];
    const lineStops = (schedules as any)[t.line] as Array<{ lat: number; lon: number }> | undefined;
    let pos = trainPosById.get(t.runId);
    if (!pos) {
      if (lineStops && lineStops.length > 0) {
        const s0 = lineStops[0];
        pos = [s0.lon, s0.lat];
        trainSegIdxById.set(t.runId, 0);
      } else {
        pos = [minLon + Math.random() * (maxLon - minLon), minLat + Math.random() * (maxLat - minLat)];
      }
      trainPosById.set(t.runId, pos);
      trainDwellMsById.set(t.runId, 0);
      if (!trainStartMs.has(t.runId)) trainStartMs.set(t.runId, now - Math.floor(Math.random() * 60000));
    }
    let lon = pos[0];
    let lat = pos[1];
    // Physics-driven speed estimation with dwell
    let distToStation = distanceToNearestStation(t.line, lon, lat);
    const previous = lastSpeedKmh.get(t.runId) ?? 60;
    let timeInMotionSec = Math.max(0, Math.round((now - (trainStartMs.get(t.runId) as number)) / 1000));
    let realSpeed = 0;
    const dwell = trainDwellMsById.get(t.runId) ?? 0;
    if (dwell > 0) {
      realSpeed = 0;
      trainDwellMsById.set(t.runId, Math.max(0, dwell - TICK_MS));
      timeInMotionSec = 0;
    } else {
      const baseSpeed = physics.calculateRealisticSpeed(distToStation, previous, timeInMotionSec, 0);
      realSpeed = Math.round(baseSpeed * speedMod);
    }
    // Path-following
    let bearing: number | undefined = undefined;
    const railPath = (railPolylineByLine as any)[t.line] as [number, number][] | undefined;
    if (railPath && railPath.length >= 2) {
      // snap-progress along rail polyline based on metersPerTick
      let segIdx = trainSegIdxById.get(t.runId) ?? 0;
      const target = railPath[Math.min(segIdx + 1, railPath.length - 1)];
      distToStation = haversineMeters([lon, lat], target);
      if ((trainDwellMsById.get(t.runId) ?? 0) === 0) {
        const metersPerTick = (realSpeed * 1000 * TICK_MS) / 3600000;
        if (metersPerTick >= distToStation && distToStation > 0) {
          lon = target[0];
          lat = target[1];
          trainPosById.set(t.runId, [lon, lat]);
          trainSegIdxById.set(t.runId, Math.min(segIdx + 1, railPath.length - 2));
        } else if (metersPerTick > 0) {
          bearing = bearingDegrees([lon, lat], target);
          const nextPos = destinationPoint([lon, lat], bearing, metersPerTick);
          lon = nextPos[0];
          lat = nextPos[1];
          trainPosById.set(t.runId, [lon, lat]);
        }
      }
    } else if (lineStops && lineStops.length >= 2) {
      let segIdx = trainSegIdxById.get(t.runId) ?? 0;
      const nextIdx = (segIdx + 1) % lineStops.length;
      const target: [number, number] = [lineStops[nextIdx].lon, lineStops[nextIdx].lat];
      distToStation = haversineMeters([lon, lat], target);
      if ((trainDwellMsById.get(t.runId) ?? 0) === 0) {
        const metersPerTick = (realSpeed * 1000 * TICK_MS) / 3600000;
        if (metersPerTick >= distToStation && distToStation > 0) {
          lon = target[0];
          lat = target[1];
          trainPosById.set(t.runId, [lon, lat]);
          trainSegIdxById.set(t.runId, nextIdx);
          trainDwellMsById.set(t.runId, 15000);
          lastSpeedKmh.set(t.runId, 0);
          timeInMotionSec = 0;
          trainStartMs.set(t.runId, now);
          bearing = undefined;
        } else if (metersPerTick > 0) {
          bearing = bearingDegrees([lon, lat], target);
          const nextPos = destinationPoint([lon, lat], bearing, metersPerTick);
          lon = nextPos[0];
          lat = nextPos[1];
          trainPosById.set(t.runId, [lon, lat]);
        }
      }
    } else {
      if (realSpeed > 0) {
        const randomBearing = Math.random() * 360;
        const metersPerTick = (realSpeed * 1000 * TICK_MS) / 3600000;
        const nextPos = destinationPoint([lon, lat], randomBearing, metersPerTick);
        lon = Math.max(minLon, Math.min(maxLon, nextPos[0]));
        lat = Math.max(minLat, Math.min(maxLat, nextPos[1]));
        trainPosById.set(t.runId, [lon, lat]);
      }
    }
    lastSpeedKmh.set(t.runId, realSpeed);
    // Energy + passengers
    const energyWhTick = energyMonitor.calculateConsumption(realSpeed);
    let pax = paxSimByTrain.get(t.runId);
    if (!pax) { pax = new PassengerSimulator(); paxSimByTrain.set(t.runId, pax); }
    const atStation = distToStation < 80 || (trainDwellMsById.get(t.runId) ?? 0) > 0;
    const paxSnapshot = pax.tick(atStation);
    return {
      type: 'Feature',
      properties: {
        id: t.runId,
        line: t.line,
        status: 'active',
        speed: realSpeed,
        energyWhTick,
        loadFactor: paxSnapshot.loadFactor,
        bearing,
        ts: now
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


