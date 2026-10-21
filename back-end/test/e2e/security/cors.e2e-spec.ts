import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type * as TestApp from '../../support/create-test-app';

const ALLOWED = 'http://localhost:5173';

// ConfigModule.forRoot reads process.env when app.module is loaded, so each
// app is loaded in a fresh module registry after CORS_ORIGINS is set.
async function bootWithCorsOrigins(
  corsOrigins: string | undefined,
): Promise<INestApplication> {
  const originalEnv = process.env;
  process.env = { ...originalEnv };
  if (corsOrigins === undefined) delete process.env.CORS_ORIGINS;
  else process.env.CORS_ORIGINS = corsOrigins;
  try {
    let createTestApp: typeof TestApp.createTestApp | undefined;
    jest.isolateModules(() => {
      ({ createTestApp } =
        require('../../support/create-test-app') as typeof TestApp);
    });
    return await createTestApp!();
  } finally {
    process.env = originalEnv;
  }
}

describe('CORS (e2e)', () => {
  describe('with CORS_ORIGINS set', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await bootWithCorsOrigins(`${ALLOWED},https://app.example.com`);
    });

    afterAll(async () => {
      await app.close();
    });

    const http = () => request(app.getHttpServer());

    it('allows a listed origin', async () => {
      const res = await http().get('/api/v1/health').set('Origin', ALLOWED);

      expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
      expect(res.headers).not.toHaveProperty(
        'access-control-allow-credentials',
      );
    });

    it('omits the allow-origin header for an unlisted origin', async () => {
      const res = await http()
        .get('/api/v1/health')
        .set('Origin', 'https://evil.example.com');

      expect(res.headers).not.toHaveProperty('access-control-allow-origin');
    });

    it('answers a preflight from a listed origin with the allowed method and headers', async () => {
      const res = await http()
        .options('/api/v1/boards')
        .set('Origin', ALLOWED)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'authorization,content-type');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
      expect(res.headers['access-control-allow-methods']).toContain('POST');
      expect(res.headers['access-control-allow-headers']).toBe(
        'authorization,content-type',
      );
    });
  });

  describe('without CORS_ORIGINS', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await bootWithCorsOrigins(undefined);
    });

    afterAll(async () => {
      await app.close();
    });

    it('sends no allow-origin header to any origin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', ALLOWED);

      expect(res.headers).not.toHaveProperty('access-control-allow-origin');
    });
  });
});
