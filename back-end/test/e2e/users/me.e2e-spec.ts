import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('GET /api/v1/me (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const account = {
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

  const register = async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(account)
      .expect(201);
    return res.body as {
      accessToken: string;
      user: { id: string; name: string; email: string; createdAt: string };
    };
  };

  const getMe = (token?: string) => {
    const req = request(app.getHttpServer()).get('/api/v1/me');
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  // Signs outside the app's JwtModule so the test controls secret and exp.
  const signToken = (payload: object, secret: string) =>
    new JwtService().sign(payload, { secret, algorithm: 'HS256' });

  const expectUnauthorized = (res: request.Response) => {
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({ type: 'about:blank', status: 401 });
    expect(res.body).not.toHaveProperty('id');
  };

  it('returns 200 with the registered user for the register token', async () => {
    const { accessToken, user } = await register();

    const res = await getMe(accessToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.stringMatching(UUID),
      name: 'Ana',
      email: 'ana@example.com',
      createdAt: expect.stringMatching(ISO_DATE),
    });
    expect(res.body).toEqual(user);
  });

  it('returns 200 with the same user for a login token', async () => {
    const { user } = await register();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: account.email, password: account.password })
      .expect(200);

    const res = await getMe(login.body.accessToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
  });

  it('returns 401 Problem Details without an Authorization header', async () => {
    expectUnauthorized(await getMe());
  });

  it('returns 401 for a valid token sent with the Basic scheme', async () => {
    const { accessToken } = await register();

    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Basic ${accessToken}`);

    expectUnauthorized(res);
  });

  it('returns 401 for a token signed with another secret', async () => {
    const { user } = await register();
    const token = signToken(
      { sub: user.id },
      'another-secret-with-at-least-32-chars',
    );

    expectUnauthorized(await getMe(token));
  });

  it('returns 401 for an expired token', async () => {
    const { user } = await register();
    const past = Math.floor(Date.now() / 1000) - 60;
    const token = signToken(
      { sub: user.id, iat: past - 3600, exp: past },
      process.env.JWT_SECRET as string,
    );

    expectUnauthorized(await getMe(token));
  });

  it('returns 401 when the token user no longer exists', async () => {
    const { accessToken } = await register();
    await dataSource.query('DELETE FROM "users"');

    expectUnauthorized(await getMe(accessToken));
  });

  it('lists /api/v1/me in the OpenAPI document with a bearer security scheme', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json');

    expect(res.status).toBe(200);
    expect(res.body.components.securitySchemes).toEqual(
      expect.objectContaining({
        bearer: expect.objectContaining({ type: 'http', scheme: 'bearer' }),
      }),
    );
    expect(res.body.paths['/api/v1/me'].get.security).toEqual([{ bearer: [] }]);
  });
});
