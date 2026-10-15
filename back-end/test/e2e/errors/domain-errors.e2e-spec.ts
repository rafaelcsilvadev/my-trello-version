import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;

const unhandledLogsFor = (
  lines: Record<string, unknown>[],
  requestId: string,
) =>
  lines.filter(
    (line) =>
      line.msg === 'Unhandled exception' && line.requestId === requestId,
  );

describe('Domain errors as Problem Details (e2e)', () => {
  let app: INestApplication;
  const lines: Record<string, unknown>[] = [];

  beforeAll(async () => {
    app = await createTestApp({
      logDestination: { write: (line: string) => lines.push(JSON.parse(line)) },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('maps EmailAlreadyRegisteredError to 409 /problems/email-already-registered', async () => {
    const res = await http().get(
      '/api/v1/test-only/throw/email-already-registered',
    );

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toEqual({
      type: '/problems/email-already-registered',
      title: 'Conflict',
      status: 409,
      detail: 'Email is already registered.',
      instance: '/api/v1/test-only/throw/email-already-registered',
      requestId: expect.any(String),
    });
  });

  it('maps InvalidCredentialsError to 401 /problems/invalid-credentials', async () => {
    const res = await http().get('/api/v1/test-only/throw/invalid-credentials');

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toEqual({
      type: '/problems/invalid-credentials',
      title: 'Unauthorized',
      status: 401,
      detail: 'Invalid email or password.',
      instance: '/api/v1/test-only/throw/invalid-credentials',
      requestId: expect.any(String),
    });
  });

  it('returns 500 with the generic detail for an unmapped DomainError', async () => {
    const res = await http().get(
      '/api/v1/test-only/throw/unmapped-domain-error',
    );

    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      type: 'about:blank',
      status: 500,
      detail: 'An unexpected error occurred.',
    });
    expect(res.text).not.toContain('secret unmapped domain failure');
  });

  it('does not log a mapped DomainError as an unhandled exception', async () => {
    await http()
      .get('/api/v1/test-only/throw/invalid-credentials')
      .set('X-Request-Id', 'mapped-domain-error');

    expect(unhandledLogsFor(lines, 'mapped-domain-error')).toHaveLength(0);
  });

  it('logs an unmapped DomainError as an unhandled exception', async () => {
    await http()
      .get('/api/v1/test-only/throw/unmapped-domain-error')
      .set('X-Request-Id', 'unmapped-domain-error');

    expect(unhandledLogsFor(lines, 'unmapped-domain-error')).toHaveLength(1);
  });
});
