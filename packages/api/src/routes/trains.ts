import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import path from 'node:path';
// Keep endpoints simple in TEST_MODE: avoid zod compilers to prevent runtime issues

export default fp(async (app: FastifyInstance) => {

  // Seed-backed data loaders (sync, cached in-memory)
  type SeedTrain = {
    id: string;
    fleetId: string;
    lineId: string;
    manufacturerId: string;
    typeKey: string;
    series?: string;
    buildYear?: number;
    depot?: string;
    status?: string;
    lastSeen?: string;
    meta?: Record<string, unknown>;
  };
  type SeedLine = { id: string; region: string; name: string; color?: string };

  function loadSeeds<T>(file: string): T {
    const p = path.join(process.cwd(), 'seeds', 'averio', file);
    const raw = readFileSync(p, 'utf-8');
    return JSON.parse(raw) as T;
  }
  const LINES: SeedLine[] = loadSeeds<SeedLine[]>('lines.json');
  const TRAINS: SeedTrain[] = loadSeeds<SeedTrain[]>('trains.json');

  // Lines are served from routes.ts to avoid duplication

  // List trains (optionally filtered)
  app.get('/api/trains', async (req: any) => {
    const { line, region, status } = (req.query ?? {}) as { line?: string; region?: string; status?: string };
    let list = TRAINS;
    if (line) list = list.filter(t => t.lineId.toLowerCase() === line.toLowerCase());
    if (region) list = list.filter(t => t.fleetId.toLowerCase().includes(region.toLowerCase()));
    if (status) list = list.filter(t => (t.status ?? '').toLowerCase() === status.toLowerCase());
    return list;
  });

  // Train by id
  app.get('/api/trains/:id', async (req: any, reply) => {
    const { id } = (req.params ?? {}) as { id: string };
    const t = TRAINS.find(x => x.id === id);
    if (!t) return reply.code(404).send({ error: 'not_found' });
    return t;
  });

  app.get('/api/trains/live', async () => ({ type: 'FeatureCollection', features: [] }));
});


