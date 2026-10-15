import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const LIMIT = 10;

describe('Auth rate limit (e2e)', () => {
  let app: INestApplication;

  // A fresh app per test resets the in-memory throttler counts.
  beforeEach(async () => {
    app = await createTestApp({ rateLimit: true });
  });

  afterEach(async () => {
    await app.get(DataSource).query('DELETE FROM "users"');
    await app.close();
  });

  const login = () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong password' });

  const register = (n: number) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Ana',
        email: `ana${n}@example.com`,
        password: 'pass1234',
      });

  const expectTooManyRequests = (res: request.Response) => {
    expect(res.status).toBe(429);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.headers['retry-after']).toMatch(/^\d+$/);
    expect(res.body).toMatchObject({
      type: 'about:blank',
      title: 'Too Many Requests',
      status: 429,
      detail: 'Too many requests. Try again later.',
    });
  };

  it('answers the 11th login request in a minute with 429', async () => {
    for (let i = 0; i < LIMIT; i++) {
      expect((await login()).status).toBe(401);
    }

    expectTooManyRequests(await login());
  });

  it('answers the 11th register request in a minute with 429', async () => {
    for (let i = 0; i < LIMIT; i++) {
      expect((await register(i)).status).toBe(201);
    }

    expectTooManyRequests(await register(LIMIT));
  });

  it('counts register apart from login', async () => {
    for (let i = 0; i <= LIMIT; i++) {
      await login();
    }

    expect((await register(0)).status).toBe(201);
  });

  it('never throttles GET /me', async () => {
    for (let i = 0; i <= LIMIT * 2; i++) {
      expect(
        (await request(app.getHttpServer()).get('/api/v1/me')).status,
      ).toBe(401);
    }
  });
});
