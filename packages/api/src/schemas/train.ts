import { z } from 'zod';

export const TrainFeature = z.object({
  type: z.literal('Feature'),
  properties: z.object({
    id: z.string(),
    line: z.string(),
    bearing: z.number().optional(),
    health: z.enum(['ok', 'warn', 'due']),
  }),
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
});

export const TrainFC = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(TrainFeature),
});

export type TrainFC = z.infer<typeof TrainFC>;
