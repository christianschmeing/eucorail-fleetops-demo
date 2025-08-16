import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default fp(async (app) => {
  const TEST_MODE = process.env.TEST_MODE === '1' || process.env.NODE_ENV === 'test';

  await app.register(cors, { origin: '*' });

  // In TEST_MODE, avoid rate limiting and pressure 503s to keep the dev loop stable
  if (!TEST_MODE) {
    await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
    await app.register(underPressure, {
      maxEventLoopDelay: 100,
      healthCheck: async () => ({ ok: true }),
      healthCheckInterval: 5000
    });
  } else {
    // Do not register under-pressure in TEST_MODE to avoid intermittent 503 during dev/e2e
  }

  await app.register(swagger, {
    openapi: { info: { title: 'Eucorail FleetOps Demo API', version: '1.0.0' } }
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  app.get('/health', async () => ({ status: 'ok' }));
});


