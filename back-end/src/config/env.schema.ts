import { z } from 'zod';

// A browser Origin is scheme://host[:port] with nothing after it; anything else
// (a path, a trailing slash, '*') would never match the request's Origin header.
const corsOrigin = z
  .url({ protocol: /^https?$/ })
  // Zod still runs refine after a failed url check, hence canParse.
  .refine((value) => URL.canParse(value) && new URL(value).origin === value);

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/)
    .default('1h'),
  // Comma-separated allow-list; empty keeps CORS disabled.
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(corsOrigin)),
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
