import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const JWT = /^[\w-]+\.[\w-]+\.[\w-]+$/;

describe('POST /api/v1/auth/register (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const valid = {
    name: 'Ana',
    email: 'ana@example.com',
    password: 'correct horse',
  };

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  const register = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/v1/auth/register').send(body);

  const countUsers = async (): Promise<number> => {
    const [{ count }] = await dataSource.query(
      'SELECT count(*)::int AS count FROM "users"',
    );
    return count;
  };

  const expectFieldError = (
    res: request.Response,
    field: 'name' | 'email' | 'password',
  ) => {
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field, message: expect.any(String) }]),
    );
    expect(res.body).not.toHaveProperty('accessToken');
  };

  it('returns 201 with a token and only the public user fields', async () => {
    const res = await register(valid);

    expect(res.status).toBe(201);
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

  it('stores a password hash, never the password', async () => {
    const res = await register(valid);

    const [row] = await dataSource.query(
      'SELECT "password_hash" FROM "users" WHERE "id" = $1',
      [res.body.user.id],
    );
    expect(row.password_hash).not.toBe(valid.password);
    expect(row.password_hash).toMatch(/^argon2id\$/);
    expect(res.text).not.toContain(row.password_hash);
    expect(res.text).not.toContain(valid.password);
  });

  it('stores the name trimmed', async () => {
    const res = await register({ ...valid, name: '  Ana  ' });

    expect(res.status).toBe(201);
    const [row] = await dataSource.query(
      'SELECT "name" FROM "users" WHERE "id" = $1',
      [res.body.user.id],
    );
    expect(row.name).toBe('Ana');
    expect(res.body.user.name).toBe('Ana');
  });

  it('stores and returns the email trimmed and lowercased', async () => {
    const res = await register({ ...valid, email: '  ANA@X.COM ' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('ana@x.com');
    const [row] = await dataSource.query(
      'SELECT "email" FROM "users" WHERE "id" = $1',
      [res.body.user.id],
    );
    expect(row.email).toBe('ana@x.com');
  });

  it('returns 409 for the same email in another case and creates no user', async () => {
    await register(valid);

    const res = await register({ ...valid, email: 'ANA@Example.com' });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      type: '/problems/email-already-registered',
      status: 409,
    });
    expect(res.body).not.toHaveProperty('accessToken');
    expect(await countUsers()).toBe(1);
  });

  it('returns 400 for name when it is empty after trimming', async () => {
    expectFieldError(await register({ ...valid, name: '   ' }), 'name');
  });

  it('returns 400 for name when it has 101 characters', async () => {
    expectFieldError(
      await register({ ...valid, name: 'a'.repeat(101) }),
      'name',
    );
  });

  it('returns 400 for email when it is not an email address', async () => {
    expectFieldError(
      await register({ ...valid, email: 'not-an-email' }),
      'email',
    );
  });

  it('returns 400 for email when it has 255 characters', async () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(62)}`;
    expect(email).toHaveLength(255);

    expectFieldError(await register({ ...valid, email }), 'email');
  });

  it('returns 400 for password when it has 7 characters', async () => {
    expectFieldError(
      await register({ ...valid, password: 'a'.repeat(7) }),
      'password',
    );
  });

  it('returns 400 for password when it has 73 characters', async () => {
    expectFieldError(
      await register({ ...valid, password: 'a'.repeat(73) }),
      'password',
    );
  });

  it('returns 400 for a non-string name instead of crashing the trim', async () => {
    expectFieldError(await register({ ...valid, name: 42 }), 'name');
  });

  it('accepts the boundary lengths: 1 and 100 char name, 8 and 72 char password', async () => {
    const short = await register({
      name: 'A',
      email: 'short@example.com',
      password: 'a'.repeat(8),
    });
    const long = await register({
      name: 'a'.repeat(100),
      email: 'long@example.com',
      password: 'a'.repeat(72),
    });

    expect(short.status).toBe(201);
    expect(long.status).toBe(201);
  });

  it('returns 400 for a property not in the contract', async () => {
    const res = await register({ ...valid, role: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field: 'role', message: expect.any(String) }]),
    );
    expect(await countUsers()).toBe(0);
  });
});
