import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../support/create-test-app';

describe('API docs (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/docs returns 200 with the Swagger UI HTML page', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.text).toContain('swagger-ui');
  });

  it('GET /api/docs-json returns 200 with an OpenAPI 3 document that includes the health endpoint', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths).toHaveProperty(['/api/v1/health', 'get']);
  });
});
