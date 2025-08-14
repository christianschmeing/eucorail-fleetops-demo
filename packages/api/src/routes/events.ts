import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { FastifySSEPlugin } from 'fastify-sse-v2';

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
  return { type: 'FeatureCollection', features: [] };
}


