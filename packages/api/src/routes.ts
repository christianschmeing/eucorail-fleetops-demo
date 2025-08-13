import { readFileSync } from 'node:fs';
import type { FastifyInstance } from 'fastify';

export async function registerRoutes(app: FastifyInstance) {
  app.get('/api/lines', async () => JSON.parse(readFileSync('data/lines.json', 'utf-8')));
  app.get('/api/trains/live', async () => JSON.parse(readFileSync('data/fleet.json', 'utf-8')));
  app.get('/api/fleet/health', async () => ({
    alerts24h: [{ code: 'DOOR_23', count: 5 }, { code: 'HVAC_12', count: 3 }],
    dueSoon: [{ runId: 'RE9-78001', kmRemaining: 1800 }, { runId: 'MEX16-66012', daysRemaining: 25 }]
  }));
}

