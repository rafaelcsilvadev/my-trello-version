import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type * as CreateTestAppModule from '../../support/create-test-app';

type LogLine = Record<string, any>;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PINO_ERROR_LEVEL = 50;

// Fresh module registry per app: ConfigModule.forRoot reads process.env
// (LOG_LEVEL) when app.module is loaded.
async function bootApp(
  env: Record<string, string> = {},
): Promise<{ app: INestApplication; lines: LogLine[] }> {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...env };
  try {
    let support: typeof CreateTestAppModule | undefined;
    jest.isolateModules(() => {
      support = require('../../support/create-test-app');
    });
    const lines: LogLine[] = [];
    const app = await support!.createTestApp({
      logDestination: { write: (line: string) => lines.push(JSON.parse(line)) },
    });
    return { app, lines };
  } finally {
    process.env = originalEnv;
  }
}

const accessLinesFor = (lines: LogLine[], requestId: string) =>
  lines.filter((line) => line.requestId === requestId && 'res' in line);

describe('Structured logging with request id (e2e)', () => {
  let app: INestApplication;
  let lines: LogLine[];

  beforeAll(async () => {
    ({ app, lines } = await bootApp());
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('echoes a valid X-Request-Id in the response header', async () => {
    const res = await http()
      .post('/api/v1/test-only/validation')
      .set('X-Request-Id', 'abc')
      .send({ name: 'ok', quantity: 1 });

    expect(res.headers['x-request-id']).toBe('abc');
  });

  it('returns a generated UUID v4 in X-Request-Id when the request has none', async () => {
    const res = await http()
      .post('/api/v1/test-only/validation')
      .send({ name: 'ok', quantity: 1 });

    expect(res.headers['x-request-id']).toMatch(UUID_V4);
  });

  it('returns X-Request-Id and logs the request when the body is not valid JSON', async () => {
    const res = await http()
      .post('/api/v1/test-only/validation')
      .set('X-Request-Id', 'malformed-json')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(res.status).toBe(400);
    expect(res.headers['x-request-id']).toBe('malformed-json');
    expect(res.body.requestId).toBe('malformed-json');
    expect(accessLinesFor(lines, 'malformed-json')).toHaveLength(1);
  });

  it('writes one JSON line with requestId, method, URL, status and duration', async () => {
    await http()
      .post('/api/v1/test-only/validation?source=e2e')
      .set('X-Request-Id', 'access-line')
      .send({ name: 'ok', quantity: 1 });

    const access = accessLinesFor(lines, 'access-line');
    expect(access).toHaveLength(1);
    expect(access[0].req.method).toBe('POST');
    expect(access[0].req.url).toBe('/api/v1/test-only/validation?source=e2e');
    expect(access[0].res.statusCode).toBe(201);
    expect(typeof access[0].responseTime).toBe('number');
  });

  it('redacts the Authorization header as "[REDACTED]"', async () => {
    await http()
      .post('/api/v1/test-only/validation')
      .set('X-Request-Id', 'redact-auth')
      .set('Authorization', 'Bearer secret-token')
      .send({ name: 'ok', quantity: 1 });

    const [access] = accessLinesFor(lines, 'redact-auth');
    expect(access.req.headers.authorization).toBe('[REDACTED]');
    expect(JSON.stringify(lines)).not.toContain('secret-token');
  });

  it('redacts password fields as "[REDACTED]" in application logs', async () => {
    await http()
      .post('/api/v1/test-only/log')
      .set('X-Request-Id', 'redact-password')
      .send({ name: 'kept', password: 'p1', user: { password: 'p2' } });

    const logged = lines.find(
      (line) => line.requestId === 'redact-password' && 'body' in line,
    );
    expect(logged?.body).toEqual({
      name: 'kept',
      password: '[REDACTED]',
      user: { password: '[REDACTED]' },
    });
  });

  it('redacts password fields at any depth and inside arrays', async () => {
    await http()
      .post('/api/v1/test-only/log')
      .set('X-Request-Id', 'redact-deep-password')
      .send({
        a: { b: { password: 'p3' } },
        users: [{ password: 'p4' }],
      });

    const logged = lines.find(
      (line) => line.requestId === 'redact-deep-password' && 'body' in line,
    );
    expect(logged?.body).toEqual({
      a: { b: { password: '[REDACTED]' } },
      users: [{ password: '[REDACTED]' }],
    });
  });

  it('redacts password fields of class instances and logger bindings', async () => {
    await http()
      .post('/api/v1/test-only/log-instance')
      .set('X-Request-Id', 'redact-instance')
      .send({ password: 'p5' });

    const logged = lines.find(
      (line) => line.requestId === 'redact-instance' && 'body' in line,
    );
    expect(logged?.body).toEqual({ password: '[REDACTED]' });
    expect(logged?.bound).toEqual({ password: '[REDACTED]' });
    expect(JSON.stringify(lines)).not.toContain('p5');
  });

  it('logs an unhandled exception at error level with its stack and requestId', async () => {
    await http().get('/api/v1/test-only/throw').set('X-Request-Id', 'boom');

    const errorLine = lines.find(
      (line) =>
        line.requestId === 'boom' &&
        line.level === PINO_ERROR_LEVEL &&
        !('res' in line),
    );
    expect(errorLine?.err.stack).toContain('Error: secret internal failure');
  });

  it('suppresses the info access line when LOG_LEVEL=warn', async () => {
    const quiet = await bootApp({ LOG_LEVEL: 'warn' });
    try {
      await request(quiet.app.getHttpServer())
        .post('/api/v1/test-only/validation')
        .set('X-Request-Id', 'quiet-ok')
        .send({ name: 'ok', quantity: 1 });
      await request(quiet.app.getHttpServer())
        .get('/api/v1/test-only/throw')
        .set('X-Request-Id', 'quiet-boom');

      expect(quiet.lines.filter((l) => l.requestId === 'quiet-ok')).toEqual([]);
      expect(
        quiet.lines.some(
          (l) => l.requestId === 'quiet-boom' && l.level === PINO_ERROR_LEVEL,
        ),
      ).toBe(true);
    } finally {
      await quiet.app.close();
    }
  });
});
