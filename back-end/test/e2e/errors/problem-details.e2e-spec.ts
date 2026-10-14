import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;

describe('Problem Details error format (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  function expectProblemShape(
    body: Record<string, unknown>,
    status: number,
    instance: string,
  ): void {
    expect(body).toMatchObject({
      type: 'about:blank',
      status,
      instance,
    });
    expect(typeof body.title).toBe('string');
    expect(typeof body.detail).toBe('string');
    expect(typeof body.requestId).toBe('string');
    expect(body.requestId).not.toBe('');
  }

  it('returns 404 Problem Details for an unknown route, with instance as the path only', async () => {
    const res = await http().get('/api/v1/does-not-exist?q=1');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expectProblemShape(res.body, 404, '/api/v1/does-not-exist');
    expect(res.body.title).toBe('Not Found');
  });

  it('returns 400 with field errors when the body fails validation', async () => {
    const res = await http()
      .post('/api/v1/test-only/validation')
      .send({ name: 42, quantity: 0 });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expectProblemShape(res.body, 400, '/api/v1/test-only/validation');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'name', message: expect.any(String) },
        { field: 'quantity', message: expect.any(String) },
      ]),
    );
    expect(res.body.errors).toHaveLength(2);
  });

  it('returns 400 listing a property not declared in the contract', async () => {
    const res = await http()
      .post('/api/v1/test-only/validation')
      .send({ name: 'ok', quantity: 1, extra: true });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expectProblemShape(res.body, 400, '/api/v1/test-only/validation');
    expect(res.body.errors).toEqual([
      { field: 'extra', message: expect.any(String) },
    ]);
  });

  it('returns 400 "Request body is not valid JSON." for a malformed JSON body', async () => {
    const res = await http()
      .post('/api/v1/test-only/validation')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expectProblemShape(res.body, 400, '/api/v1/test-only/validation');
    expect(res.body.detail).toBe('Request body is not valid JSON.');
  });

  it('returns 500 with a generic detail and no stack or message for an unhandled exception', async () => {
    const res = await http().get('/api/v1/test-only/throw');

    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expectProblemShape(res.body, 500, '/api/v1/test-only/throw');
    expect(res.body.detail).toBe('An unexpected error occurred.');
    expect(res.text).not.toContain('secret internal failure');
    expect(res.body).not.toHaveProperty('stack');
    expect(res.text).not.toMatch(/at .*\.ts:\d+/);
  });

  it('serves routes only under /api/v1', async () => {
    const valid = await http()
      .post('/api/v1/test-only/validation')
      .send({ name: 'ok', quantity: 1 });
    const unprefixed = await http()
      .post('/test-only/validation')
      .send({ name: 'ok', quantity: 1 });

    expect(valid.status).toBe(201);
    expect(valid.body).toEqual({ name: 'ok', quantity: 1 });
    expect(unprefixed.status).toBe(404);
    expect(unprefixed.headers['content-type']).toMatch(PROBLEM_JSON);
  });

  it('omits errors on problems that are not validation failures', async () => {
    const res = await http().get('/api/v1/test-only/throw');

    expect(res.body).not.toHaveProperty('errors');
  });
});
