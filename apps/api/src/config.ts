import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_JWT_SECRET: z.string().min(16).optional(),
});

/** Fails fast at boot if the environment is wrong. Never log this object (it holds secrets). */
export const loadConfig = (env: NodeJS.ProcessEnv = process.env) => {
  const cfg = schema.parse(env);
  if (cfg.NODE_ENV === 'production' && (!cfg.SUPABASE_URL || !cfg.SUPABASE_JWT_SECRET)) {
    throw new Error('SUPABASE_URL and SUPABASE_JWT_SECRET are required in production');
  }
  return { ...cfg, origins: cfg.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) };
};
export type Config = ReturnType<typeof loadConfig>;
