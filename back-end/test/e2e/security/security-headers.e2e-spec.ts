import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../support/create-test-app';

describe('Security headers (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  function expectSecurityHeaders(headers: Record<string, string>): void {
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['strict-transport-security']).toBeDefined();
    expect(headers).not.toHaveProperty('x-powered-by');
  }

  it('sets security headers on API responses', async () => {
    const res = await http().get('/api/v1/health');

    expectSecurityHeaders(res.headers as Record<string, string>);
  });

  it('sets security headers on error responses raised before routing', async () => {
    const res = await http().get('/outside-prefix');

    expect(res.status).toBe(404);
    expectSecurityHeaders(res.headers as Record<string, string>);
  });

  it('keeps the Swagger UI page and its init script reachable', async () => {
    const page = await http().get('/api/docs');
    const init = await http().get('/api/docs/swagger-ui-init.js');

    expect(page.status).toBe(200);
    expectSecurityHeaders(page.headers as Record<string, string>);
    expect(init.status).toBe(200);
  });
});
