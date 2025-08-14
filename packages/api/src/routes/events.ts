import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { FastifySSEPlugin } from 'fastify-sse-v2';
import { readFileSync } from 'node:fs';

export default fp(async (app: FastifyInstance) => {
  await app.register(FastifySSEPlugin);
  const HEARTBEAT_MS = 15000;

  app.get('/events', async (req, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    const lastId = (req.headers['last-event-id'] as string) ?? '0';
    reply.sse({ id: lastId, event: 'ping', data: 'ready' });

    const updateTimer = setInterval(() => {
      const payload = getLiveTrainSnapshot();
      reply.sse({ event: 'train:update', data: JSON.stringify(payload) });
    }, 500);

    const hbTimer = setInterval(() => {
      reply.sse({ event: 'hb', data: Date.now().toString() });
    }, HEARTBEAT_MS);

    req.raw.on('close', () => {
      clearInterval(updateTimer);
      clearInterval(hbTimer);
    });
  });
});

function getLiveTrainSnapshot() {
  const fleet = JSON.parse(readFileSync('data/fleet.json', 'utf-8')) as Array<{ runId: string; line: string }>;
  const bboxByLine: Record<string, [number, number, number, number]> = {
    RE9: [10.05, 48.30, 10.97, 48.60],
    MEX16: [9.10, 48.65, 10.05, 48.75],
    RE8: [9.05, 48.70, 10.00, 49.90],
    BY: [10.0, 48.3, 12.0, 49.2],
    BW: [8.5, 48.4, 9.9, 49.1]
  };
  const features = fleet.map((t) => {
    const [minLon, minLat, maxLon, maxLat] = bboxByLine[t.line] || [9.0, 48.5, 11.5, 50.0];
    const lon = minLon + Math.random() * (maxLon - minLon);
    const lat = minLat + Math.random() * (maxLat - minLat);
    return {
      type: 'Feature',
      properties: { id: t.runId, line: t.line, health: 'ok' },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    };
  });
  return { type: 'FeatureCollection', features };
}


