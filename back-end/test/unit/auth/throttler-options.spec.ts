import { ConfigService } from '@nestjs/config';
import { createThrottlerOptions } from '../../../src/auth/auth.module';
import { validateEnv, type Env } from '../../../src/config/env.schema';

const DATABASE_URL = 'postgres://user:pass@localhost:5432/app';
const JWT_SECRET = 'a'.repeat(32);

function optionsFor(raw: Record<string, unknown> = {}) {
  const config = new ConfigService<Env, true>(
    validateEnv({ DATABASE_URL, JWT_SECRET, ...raw }),
  );
  return createThrottlerOptions(config);
}

describe('createThrottlerOptions', () => {
  it('allows 10 requests per 60 seconds by default', () => {
    expect(optionsFor()).toEqual({
      throttlers: [{ ttl: 60_000, limit: 10 }],
      errorMessage: 'Too many requests. Try again later.',
    });
  });

  it('takes the limit from AUTH_RATE_LIMIT and keeps the 60 second window', () => {
    expect(optionsFor({ AUTH_RATE_LIMIT: '100' })).toMatchObject({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    });
  });
});
