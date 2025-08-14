import Fastify from 'fastify';
import { registerRoutes } from './routes.js';
import core from './plugins/core';
import events from './routes/events';
import trains from './routes/trains';
import { readFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';

const app = Fastify({ logger: true });

// Core plugins: CORS, rate limit, under-pressure, swagger, health
await app.register(core);

app.get('/api/meta', async () => ({
  name: 'Eucorail FleetOps Demo',
  version: '0.1.0',
  disclaimer: 'Simulierte Positions- und Zustandsdaten – keine operativen Informationen'
}));

// Simple SSE emitting 1 Hz random-but-bounded locations per train
const fleet = JSON.parse(readFileSync('data/fleet.json', 'utf-8')) as Array<{ runId: string; line: string }>;

// legacy /events route removed; handled by routes/events plugin

await app.register(events);
await app.register(trains);
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

