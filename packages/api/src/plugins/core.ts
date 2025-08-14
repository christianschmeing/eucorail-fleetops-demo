import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default fp(async (app) => {
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  await app.register(underPressure, {
    maxEventLoopDelay: 100,
    healthCheck: async () => ({ ok: true }),
    healthCheckInterval: 5000
  });
  await app.register(swagger, {
    openapi: { info: { title: 'Eucorail FleetOps Demo API', version: '1.0.0' } }
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  app.get('/health', async () => ({ status: 'ok' }));
});


