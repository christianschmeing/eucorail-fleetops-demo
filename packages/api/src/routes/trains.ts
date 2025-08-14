import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TrainFC } from '../schemas/train';
import { validatorCompiler, serializerCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';

export default fp(async (app: FastifyInstance) => {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const zQuery = z.object({ line: z.string().optional() });
  const route = (app as unknown as ZodTypeProvider['instance']).withTypeProvider<ZodTypeProvider>();

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


