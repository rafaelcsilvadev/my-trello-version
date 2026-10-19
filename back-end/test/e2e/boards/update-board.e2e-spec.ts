import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;

describe('PATCH /api/v1/boards/:id (e2e)', () => {
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

  const createBoard = async (token: string, body: object) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/boards')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);
    return res.body;
  };

  // The archive endpoint comes later (T9), so archive straight in the table.
  const archiveBoard = async (id: string) => {
    await dataSource.query(
      'UPDATE "boards" SET "archived_at" = now() WHERE "id" = $1',
      [id],
    );
  };

  const patch = (token: string, id: string, body: unknown) =>
    request(app.getHttpServer())
      .patch(`/api/v1/boards/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);

  const read = async (token: string, id: string) => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/boards/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  const roadmap = { title: 'Roadmap', description: 'Q4 plan' };

  it('updates only the title and returns a later updatedAt', async () => {
    const created = await createBoard(anaToken, roadmap);

    const res = await patch(anaToken, created.id, { title: '  Launch  ' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...created,
      title: 'Launch',
      updatedAt: expect.any(String),
    });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.updatedAt).getTime(),
    );
    expect(await read(anaToken, created.id)).toEqual(res.body);
  });

  it('clears the description with null', async () => {
    const created = await createBoard(anaToken, roadmap);

    const res = await patch(anaToken, created.id, { description: null });

    expect(res.status).toBe(200);
    expect(res.body.description).toBeNull();
    expect(res.body.title).toBe('Roadmap');
  });

  it('clears the description with a blank string', async () => {
    const created = await createBoard(anaToken, roadmap);

    const res = await patch(anaToken, created.id, { description: '   ' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBeNull();
  });

  it('accepts a 100-char title and a 1000-char description', async () => {
    const created = await createBoard(anaToken, roadmap);
    const body = { title: 'a'.repeat(100), description: 'd'.repeat(1000) };

    const res = await patch(anaToken, created.id, body);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(body);
  });

  it.each([
    ['title is null', { title: null }, 'title'],
    ['title is empty', { title: '' }, 'title'],
    ['title is blank', { title: '   ' }, 'title'],
    ['title is not a string', { title: 42 }, 'title'],
    ['title has 101 chars', { title: 'a'.repeat(101) }, 'title'],
    ['description is not a string', { description: 42 }, 'description'],
    [
      'description has 1001 chars',
      { description: 'd'.repeat(1001) },
      'description',
    ],
  ])('returns 400 and keeps the board when %s', async (_, body, field) => {
    const created = await createBoard(anaToken, roadmap);

    const res = await patch(anaToken, created.id, body);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field, message: expect.any(String) }]),
    );
    expect(await read(anaToken, created.id)).toEqual(created);
  });

  it('returns 400 with an error per invalid field', async () => {
    const created = await createBoard(anaToken, roadmap);

    const res = await patch(anaToken, created.id, {
      title: null,
      description: 'd'.repeat(1001),
    });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'description']));
  });

  it('returns 400 for an unknown property and keeps the board', async () => {
    const created = await createBoard(anaToken, roadmap);

    const res = await patch(anaToken, created.id, {
      archivedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(res.status).toBe(400);
    expect(await read(anaToken, created.id)).toEqual(created);
  });

  it('returns 200 with the identical board for an empty body', async () => {
    const created = await createBoard(anaToken, roadmap);

    const res = await patch(anaToken, created.id, {});

    expect(res.status).toBe(200);
    expect(res.body).toEqual(created);
  });

  it('returns 409 board-archived on an archived board and keeps it', async () => {
    const created = await createBoard(anaToken, roadmap);
    await archiveBoard(created.id);
    const before = await read(anaToken, created.id);

    const res = await patch(anaToken, created.id, { title: 'Launch' });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/board-archived');
    expect(await read(anaToken, created.id)).toEqual(before);
  });

  it("answers another user's, an unknown and a malformed id with 404 and keeps the foreign board", async () => {
    const bobs = await createBoard(bobToken, roadmap);

    const responses = await Promise.all(
      [bobs.id, '00000000-0000-4000-8000-000000000000', 'not-a-uuid'].map(
        (id) => patch(anaToken, id, { title: 'Hijacked' }),
      ),
    );

    for (const res of responses) {
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.type).toBe('/problems/board-not-found');
    }
    expect(await read(bobToken, bobs.id)).toEqual(bobs);
  });

  it('returns 401 without an access token', async () => {
    const created = await createBoard(anaToken, roadmap);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/boards/${created.id}`)
      .send({ title: 'Launch' });

    expect(res.status).toBe(401);
    expect(await read(anaToken, created.id)).toEqual(created);
  });
});
