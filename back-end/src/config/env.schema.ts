import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join('.'));
    throw new Error(`Invalid environment: ${names.join(', ')}`);
  }
  return result.data;
}
