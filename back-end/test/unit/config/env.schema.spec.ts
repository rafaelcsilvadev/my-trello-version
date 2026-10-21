import { validateEnv } from '../../../src/config/env.schema';

const DATABASE_URL = 'postgres://user:pass@localhost:5432/app';
const JWT_SECRET = 'a'.repeat(32);

describe('validateEnv', () => {
  it('returns typed values when every variable is valid', () => {
    const env = validateEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      LOG_LEVEL: 'debug',
      DATABASE_URL,
      JWT_SECRET,
      JWT_EXPIRES_IN: '15m',
      CORS_ORIGINS: 'https://app.example.com',
    });

    expect(env).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      LOG_LEVEL: 'debug',
      DATABASE_URL,
      JWT_SECRET,
      JWT_EXPIRES_IN: '15m',
      CORS_ORIGINS: ['https://app.example.com'],
    });
  });

  it('applies defaults when optional variables are missing', () => {
    const env = validateEnv({ DATABASE_URL, JWT_SECRET });

    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      DATABASE_URL,
      JWT_SECRET,
      JWT_EXPIRES_IN: '1h',
      CORS_ORIGINS: [],
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
        DATABASE_URL,
      }),
    ).toThrow(/LOG_LEVEL/);
  });

  it('throws naming NODE_ENV when it is not a known environment', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'staging',
        DATABASE_URL,
      }),
    ).toThrow(/NODE_ENV/);
  });

  it('throws naming DATABASE_URL when it is not a postgres URL', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'mysql://user:pass@localhost:3306/app' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('throws naming JWT_SECRET when it is missing', () => {
    expect(() => validateEnv({ DATABASE_URL })).toThrow(/JWT_SECRET/);
  });

  it('throws naming JWT_SECRET when it is shorter than 32 characters', () => {
    expect(() =>
      validateEnv({ DATABASE_URL, JWT_SECRET: 'a'.repeat(31) }),
    ).toThrow(/JWT_SECRET/);
  });

  it('accepts a JWT_SECRET of exactly 32 characters', () => {
    expect(validateEnv({ DATABASE_URL, JWT_SECRET }).JWT_SECRET).toBe(
      JWT_SECRET,
    );
  });

  it.each(['30s', '15m', '1h', '7d'])(
    'accepts JWT_EXPIRES_IN %s',
    (expiresIn) => {
      expect(
        validateEnv({ DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN: expiresIn })
          .JWT_EXPIRES_IN,
      ).toBe(expiresIn);
    },
  );

  it.each(['1week', '1', 'h', '1.5h', '-1h', ' 1h'])(
    'throws naming JWT_EXPIRES_IN when it is %p',
    (expiresIn) => {
      expect(() =>
        validateEnv({ DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN: expiresIn }),
      ).toThrow(/JWT_EXPIRES_IN/);
    },
  );

  it('splits CORS_ORIGINS on commas, trimming spaces and empty entries', () => {
    expect(
      validateEnv({
        DATABASE_URL,
        JWT_SECRET,
        CORS_ORIGINS: ' http://localhost:5173 ,https://app.example.com:8443,',
      }).CORS_ORIGINS,
    ).toEqual(['http://localhost:5173', 'https://app.example.com:8443']);
  });

  it('treats an empty CORS_ORIGINS as no allowed origins', () => {
    expect(
      validateEnv({ DATABASE_URL, JWT_SECRET, CORS_ORIGINS: '' }).CORS_ORIGINS,
    ).toEqual([]);
  });

  it.each([
    '*',
    'localhost:5173',
    'ftp://files.example.com',
    'http://localhost:5173/',
    'https://app.example.com/path',
    'https://app.example.com?x=1',
  ])('throws naming CORS_ORIGINS when an entry is %p', (origin) => {
    expect(() =>
      validateEnv({
        DATABASE_URL,
        JWT_SECRET,
        CORS_ORIGINS: `http://localhost:5173,${origin}`,
      }),
    ).toThrow(/CORS_ORIGINS/);
  });
});
