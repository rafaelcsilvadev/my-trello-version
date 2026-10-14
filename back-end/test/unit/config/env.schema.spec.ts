import { validateEnv } from '../../../src/config/env.schema';

describe('validateEnv', () => {
  it('returns typed values when every variable is valid', () => {
    const env = validateEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      LOG_LEVEL: 'debug',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
    });

    expect(env).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      LOG_LEVEL: 'debug',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
    });
  });

  it('applies defaults when optional variables are missing', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
    });

    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
    });
  });

  it('throws naming DATABASE_URL when it is missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('throws naming every invalid variable at once', () => {
    expect(() => validateEnv({ PORT: 'abc' })).toThrow(
      /(?=.*DATABASE_URL)(?=.*PORT)/s,
    );
  });

  it('throws naming LOG_LEVEL when it is not a pino level', () => {
    expect(() =>
      validateEnv({
        LOG_LEVEL: 'verbose',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
      }),
    ).toThrow(/LOG_LEVEL/);
  });

  it('throws naming NODE_ENV when it is not a known environment', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'staging',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
      }),
    ).toThrow(/NODE_ENV/);
  });

  it('throws naming DATABASE_URL when it is not a postgres URL', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'mysql://user:pass@localhost:3306/app' }),
    ).toThrow(/DATABASE_URL/);
  });
});
