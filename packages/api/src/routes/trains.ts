import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TrainFC } from '../schemas/train.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { validatorCompiler, serializerCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';

export default fp(async (app: FastifyInstance) => {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const zQuery = z.object({ line: z.string().optional(), region: z.string().optional(), status: z.string().optional() });
  const route = app.withTypeProvider<ZodTypeProvider>();

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

  // List lines
  route.get('/api/lines', {
    schema: {
      response: { 200: z.array(z.object({ id: z.string(), region: z.string(), name: z.string(), color: z.string().optional() })) }
    }
  }, async () => LINES);

  // List trains (optionally filtered)
  route.get('/api/trains', {
    schema: {
      querystring: zQuery,
      response: { 200: z.array(z.any()) }
    }
  }, async (req) => {
    const { line, region, status } = req.query as z.infer<typeof zQuery>;
    let list = TRAINS;
    if (line) list = list.filter(t => t.lineId.toLowerCase() === line.toLowerCase());
    if (region) list = list.filter(t => t.fleetId.toLowerCase().includes(region.toLowerCase()));
    if (status) list = list.filter(t => (t.status ?? '').toLowerCase() === status.toLowerCase());
    return list;
  });

  // Train by id
  route.get('/api/trains/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      response: { 200: z.any(), 404: z.object({ error: z.string() }) }
    }
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const t = TRAINS.find(x => x.id === id);
    if (!t) return reply.code(404).send({ error: 'not_found' });
    return t;
  });

  route.get('/api/trains/live', {
    schema: {
      querystring: zQuery,
      response: { 200: TrainFC }
    }
  }, async () => {
    const fc: TrainFC = { type: 'FeatureCollection', features: [] };
    return fc;
  });
});


