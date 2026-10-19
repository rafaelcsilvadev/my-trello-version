import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('POST /api/v1/boards/:id/archive and /unarchive (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let anaToken: string;
  let bobToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  const register = async (name: string, email: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name, email, password: 'correct horse' })
      .expect(201);
    return res.body.accessToken;
  };

  beforeEach(async () => {
    anaToken = await register('Ana', 'ana@example.com');
    bobToken = await register('Bob', 'bob@example.com');
  });

  // Deleting the owner cascades to their boards (BRD-23).
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  const createBoard = async (token: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Roadmap', description: 'Q4 plan' })
      .expect(201);
    return res.body;
  };

  const action = (token: string, id: string, name: 'archive' | 'unarchive') =>
    request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/${name}`)
      .set('Authorization', `Bearer ${token}`);

  const listIds = async (token: string, query = '') => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/boards${query}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body.map((board: { id: string }) => board.id);
  };

  const read = async (token: string, id: string) => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/boards/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  it('archives an active board and moves it to the archived list', async () => {
    const created = await createBoard(anaToken);

    const before = Date.now();
    const res = await action(anaToken, created.id, 'archive');
    const after = Date.now();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...created,
      archivedAt: expect.stringMatching(ISO_DATE),
      updatedAt: expect.any(String),
    });
    const archivedAt = Date.parse(res.body.archivedAt);
    expect(archivedAt).toBeGreaterThanOrEqual(before);
    expect(archivedAt).toBeLessThanOrEqual(after);
    expect(await listIds(anaToken)).toEqual([]);
    expect(await listIds(anaToken, '?archived=true')).toEqual([created.id]);
  });

  it('returns the same archivedAt when archiving twice', async () => {
    const created = await createBoard(anaToken);
    const first = await action(anaToken, created.id, 'archive').expect(200);

    const res = await action(anaToken, created.id, 'archive');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(first.body);
  });

  it('unarchives an archived board and moves it back to the active list', async () => {
    const created = await createBoard(anaToken);
    await action(anaToken, created.id, 'archive').expect(200);

    const res = await action(anaToken, created.id, 'unarchive');

    expect(res.status).toBe(200);
    expect(res.body.archivedAt).toBeNull();
    expect(await listIds(anaToken)).toEqual([created.id]);
    expect(await listIds(anaToken, '?archived=true')).toEqual([]);
  });

  it('returns an active board unchanged when unarchiving it', async () => {
    const created = await createBoard(anaToken);

    const res = await action(anaToken, created.id, 'unarchive');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(created);
  });

  it.each(['archive', 'unarchive'] as const)(
    "answers %s on another user's, an unknown and a malformed id with 404 and keeps the foreign board",
    async (name) => {
      const bobs = await createBoard(bobToken);
      if (name === 'unarchive') {
        await action(bobToken, bobs.id, 'archive').expect(200);
      }
      const before = await read(bobToken, bobs.id);

      const responses = await Promise.all(
        [bobs.id, '00000000-0000-4000-8000-000000000000', 'not-a-uuid'].map(
          (id) => action(anaToken, id, name),
        ),
      );

      const bodies = responses.map((res) => {
        expect(res.status).toBe(404);
        expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
        const {
          instance: _instance,
          requestId: _requestId,
          ...rest
        } = res.body;
        return rest;
      });
      expect(bodies[0].type).toBe('/problems/board-not-found');
      expect(bodies[1]).toEqual(bodies[0]);
      expect(bodies[2]).toEqual(bodies[0]);
      expect(await read(bobToken, bobs.id)).toEqual(before);
    },
  );

  it.each(['archive', 'unarchive'] as const)(
    'returns 401 on %s without an access token',
    async (name) => {
      const created = await createBoard(anaToken);

      const res = await request(app.getHttpServer()).post(
        `/api/v1/boards/${created.id}/${name}`,
      );

      expect(res.status).toBe(401);
      expect(await read(anaToken, created.id)).toEqual(created);
    },
  );
});
