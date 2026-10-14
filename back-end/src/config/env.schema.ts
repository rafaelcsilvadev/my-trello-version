export type Env = {
  NODE_ENV: string;
  PORT: number;
  LOG_LEVEL: string;
  DATABASE_URL: string;
};

export function validateEnv(raw: Record<string, unknown>): Env {
  if (raw.DATABASE_URL === undefined) {
    throw new Error('Invalid environment: DATABASE_URL');
  }

  return {
    NODE_ENV: String(raw.NODE_ENV ?? 'development'),
    PORT: Number(raw.PORT ?? 3000),
    LOG_LEVEL: String(raw.LOG_LEVEL ?? 'info'),
    DATABASE_URL: String(raw.DATABASE_URL),
  };
}
