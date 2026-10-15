import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const JWT = /^[\w-]+\.[\w-]+\.[\w-]+$/;

describe('POST /api/v1/auth/login (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const credentials = { email: 'ana@example.com', password: 'correct horse' };

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Ana', ...credentials })
      .expect(201);
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send(body);

  const expectInvalidCredentials = (res: request.Response) => {
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      type: '/problems/invalid-credentials',
      status: 401,
      detail: 'Invalid email or password.',
    });
    expect(res.body).not.toHaveProperty('accessToken');
  };

  const expectFieldError = (
    res: request.Response,
    field: 'email' | 'password',
  ) => {
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field, message: expect.any(String) }]),
    );
    expect(res.body).not.toHaveProperty('accessToken');
  };

  it('returns 200 with a token and only the public user fields', async () => {
    const res = await login(credentials);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      accessToken: expect.stringMatching(JWT),
      user: {
        id: expect.stringMatching(UUID),
        name: 'Ana',
        email: 'ana@example.com',
        createdAt: expect.stringMatching(ISO_DATE),
      },
    });
  });

  it('accepts the email in upper case with surrounding spaces', async () => {
    const res = await login({ ...credentials, email: '  ANA@EXAMPLE.COM ' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ana@example.com');
  });

  it('returns 401 invalid credentials for a wrong password', async () => {
    const res = await login({ ...credentials, password: 'wrong horse' });

    expectInvalidCredentials(res);
  });

  it('returns 401 invalid credentials for an unknown email', async () => {
    const res = await login({ ...credentials, email: 'bob@example.com' });

    expectInvalidCredentials(res);
  });

  it('answers wrong password and unknown email identically', async () => {
    const wrongPassword = await login({ ...credentials, password: 'nope' });
    const unknownEmail = await login({
      ...credentials,
      email: 'x@example.com',
    });

    const contract = ({ body }: request.Response) => ({
      type: body.type,
      title: body.title,
      status: body.status,
      detail: body.detail,
    });
    expect(contract(unknownEmail)).toEqual(contract(wrongPassword));
  });

  it('returns 400 for a missing email', async () => {
    const res = await login({ password: credentials.password });

    expectFieldError(res, 'email');
  });

  it('returns 400 for an empty email after trim', async () => {
    const res = await login({ ...credentials, email: '   ' });

    expectFieldError(res, 'email');
  });

  it('returns 400 for a missing password', async () => {
    const res = await login({ email: credentials.email });

    expectFieldError(res, 'password');
  });

  it('returns 400 for an empty password', async () => {
    const res = await login({ ...credentials, password: '' });

    expectFieldError(res, 'password');
  });

  it('returns 400 for a non-string password', async () => {
    const res = await login({ ...credentials, password: 12345678 });

    expectFieldError(res, 'password');
  });

  it('returns 400 with an error per field when both are missing', async () => {
    const res = await login({});

    expectFieldError(res, 'email');
    expectFieldError(res, 'password');
  });

  it('returns 401, not 400, for a password below the register minimum', async () => {
    const res = await login({ ...credentials, password: 'x' });

    expectInvalidCredentials(res);
  });

  it('returns 400 for an unknown property', async () => {
    const res = await login({ ...credentials, role: 'admin' });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
  });
});
