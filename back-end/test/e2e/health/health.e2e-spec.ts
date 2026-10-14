import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../support/create-test-app';

describe('GET /api/v1/health (e2e)', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('returns 200 with database up when the database answers', async () => {
    app = await createTestApp();

    const res = await request(app.getHttpServer()).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', checks: { database: 'up' } });
  });

  it('returns 503 with database down when the database does not answer within 3 seconds', async () => {
    const hangingDataSource = { query: () => new Promise(() => {}) };
    app = await createTestApp({ dataSource: hangingDataSource });

    const res = await request(app.getHttpServer()).get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', checks: { database: 'down' } });
  }, 10_000);
});
