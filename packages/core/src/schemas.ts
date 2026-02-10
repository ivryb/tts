import { z } from 'zod';

export const synthesizeOptionsSchema = z.object({
  text: z.string().min(1),
  voice: z.string().optional(),
  language: z.string().optional(),
  speed: z.number().positive().optional(),
  instructions: z.string().optional(),
  ssml: z.string().optional(),
  outputFormat: z.string().optional(),
  sampleRate: z.number().int().positive().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  maxRetries: z.number().int().min(0).max(5).optional(),
});
