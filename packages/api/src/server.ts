import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes.js';
import { readFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';

const app = Fastify({ logger: true });

// CORS für localhost:3001 erlauben
await app.register(cors, { 
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Cache-Control']
});

app.get('/api/meta', async () => ({
  name: 'Eucorail FleetOps Demo',
  version: '0.1.0',
  disclaimer: 'Simulierte Positions- und Zustandsdaten – keine operativen Informationen'
}));

// Simple SSE emitting 1 Hz random-but-bounded locations per train
const fleet = JSON.parse(readFileSync('data/fleet.json', 'utf-8')) as Array<{ runId: string; line: string }>;

// Optional preflight support (not required for EventSource, but harmless)
app.options('/events', async (req, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Cache-Control,Content-Type,Accept');
  reply.status(204).send();
});

app.get('/events', async (req, reply) => {
  // Ensure Fastify doesn't modify the stream; set correct SSE headers
  reply.hijack();
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });
  // @ts-ignore
  if (typeof reply.raw.flushHeaders === 'function') reply.raw.flushHeaders();
  // Keep the socket open indefinitely
  // @ts-ignore
  if (typeof reply.raw.setTimeout === 'function') reply.raw.setTimeout(0);
  // Safari tends to buffer until ~2KB — send padding comment first
  reply.raw.write(':' + ' '.repeat(2048) + '\n\n');
  reply.raw.write(`retry: 5000\n\n`);
  // Prime the stream so clients see immediate data
  reply.raw.write(`event: ready\n`);
  reply.raw.write(`data: {"ok":true}\n\n`);

  const tick = () => {
    const now = Date.now();
    for (const t of fleet) {
      const bboxByLine: Record<string, [number, number, number, number]> = {
        RE9: [10.05, 48.30, 10.97, 48.60],
        MEX16: [9.10, 48.65, 10.05, 48.75],
        RE8: [9.05, 48.70, 10.00, 49.90]
      };
      const [minLon, minLat, maxLon, maxLat] = bboxByLine[t.line] || [9.0, 48.5, 11.0, 49.9];
      const lon = minLon + Math.random() * (maxLon - minLon);
      const lat = minLat + Math.random() * (maxLat - minLat);
      const payload = { type: 'location', runId: t.runId, line: t.line, ts: now, lon, lat, speed: 80 + Math.random() * 40 };
      reply.raw.write(`event: location\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  };
  const interval = setInterval(tick, 1000);
  const heartbeat = setInterval(() => {
    reply.raw.write(`: keep-alive\n\n`);
  }, 15000);
  req.raw.on('close', () => { clearInterval(interval); clearInterval(heartbeat); });
});

await registerRoutes(app);

const port = Number(process.env.PORT || 4100);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

// WebSocket fallback for browsers with strict SSE behaviour
const wss = new WebSocketServer({ noServer: true });
app.server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws) => {
  const sendTick = () => {
    const now = Date.now();
    for (const t of fleet) {
      const bboxByLine: Record<string, [number, number, number, number]> = {
        RE9: [10.05, 48.30, 10.97, 48.60],
        MEX16: [9.10, 48.65, 10.05, 48.75],
        RE8: [9.05, 48.70, 10.00, 49.90]
      };
      const [minLon, minLat, maxLon, maxLat] = bboxByLine[t.line] || [9.0, 48.5, 11.0, 49.9];
      const lon = minLon + Math.random() * (maxLon - minLon);
      const lat = minLat + Math.random() * (maxLat - minLat);
      const payload = { type: 'location', runId: t.runId, line: t.line, ts: now, lon, lat, speed: 80 + Math.random() * 40 };
      ws.send(JSON.stringify(payload));
    }
  };
  // Send immediately, then every second
  sendTick();
  const interval = setInterval(sendTick, 1000);
  ws.on('close', () => clearInterval(interval));
});

