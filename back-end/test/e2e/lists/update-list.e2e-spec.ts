import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('PATCH /api/v1/lists/:id (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let anaToken: string;
  let bobToken: string;
  let boardId: string;

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

  const createBoard = async (token: string, title: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title })
      .expect(201);
    return res.body.id;
  };

  const createList = async (title: string, id = boardId, token = anaToken) => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title })
      .expect(201);
    return res.body;
  };

  // The archive endpoints come later (T9), so archive straight in the table.
  const archiveList = async (id: string) => {
    await dataSource.query(
      'UPDATE "lists" SET "position" = NULL, "archived_at" = now() WHERE "id" = $1',
      [id],
    );
  };

  const archiveBoard = async (id: string) => {
    await request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/archive`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
  };

  const patch = (id: string, body: unknown, token = anaToken) =>
    request(app.getHttpServer())
      .patch(`/api/v1/lists/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);

  const read = async (id: string, token = anaToken) => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/lists/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  beforeEach(async () => {
    anaToken = await register('Ana', 'ana@example.com');
    bobToken = await register('Bob', 'bob@example.com');
    boardId = await createBoard(anaToken, 'Roadmap');
  });

  // Deleting the owner cascades to their boards and lists (LST-29).
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  it('renames the list with a trimmed title and a later updatedAt', async () => {
    const created = await createList('To do');

    const res = await patch(created.id, { title: '  Backlog  ' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...created,
      title: 'Backlog',
      updatedAt: expect.any(String),
    });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.updatedAt).getTime(),
    );
    expect(await read(created.id)).toEqual(res.body);
  });

  it('accepts a 100-char title', async () => {
    const created = await createList('To do');

    const res = await patch(created.id, { title: 'a'.repeat(100) });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('a'.repeat(100));
  });

  it('returns 200 with the identical list for an empty body', async () => {
    const created = await createList('To do');

    const res = await patch(created.id, {});

    expect(res.status).toBe(200);
    expect(res.body).toEqual(created);
    expect(await read(created.id)).toEqual(created);
  });

  it.each([
    ['title is null', { title: null }],
    ['title is empty', { title: '' }],
    ['title is blank', { title: '   ' }],
    ['title is not a string', { title: 42 }],
    ['title has 101 chars', { title: 'a'.repeat(101) }],
  ])('returns 400 and keeps the list when %s', async (_, body) => {
    const created = await createList('To do');

    const res = await patch(created.id, body);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field: 'title', message: expect.any(String) }]),
    );
    expect(await read(created.id)).toEqual(created);
  });

  it('returns 400 for an unknown property and keeps the list', async () => {
    const created = await createList('To do');

    const res = await patch(created.id, { position: 3 });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await read(created.id)).toEqual(created);
  });

  it('returns 409 list-archived on an archived list and keeps it', async () => {
    const created = await createList('Old');
    await archiveList(created.id);
    const before = await read(created.id);

    const res = await patch(created.id, { title: 'Revived' });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/list-archived');
    expect(await read(created.id)).toEqual(before);
  });

  it('returns 409 board-archived on a list of an archived board and keeps it', async () => {
    const created = await createList('To do');
    await archiveBoard(boardId);

    const res = await patch(created.id, { title: 'Backlog' });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/board-archived');
    expect(await read(created.id)).toEqual(created);
  });

  it('returns 409 board-archived on an archived list of an archived board', async () => {
    const created = await createList('Old');
    await archiveList(created.id);
    await archiveBoard(boardId);
    const before = await read(created.id);

    const res = await patch(created.id, { title: 'Revived' });

    expect(res.status).toBe(409);
    expect(res.body.type).toBe('/problems/board-archived');
    expect(await read(created.id)).toEqual(before);
  });

  it("answers another user's, an unknown and a malformed id with the same 404 and keeps the foreign list", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');
    const bobsList = await createList('Bob list', bobsBoardId, bobToken);

    const responses = await Promise.all(
      [bobsList.id, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
        patch(id, { title: 'Hijacked' }),
      ),
    );

    const bodies = responses.map((res) => {
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      const { instance: _instance, requestId: _requestId, ...rest } = res.body;
      return rest;
    });
    expect(bodies[0].type).toBe('/problems/list-not-found');
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    expect(await read(bobsList.id, bobToken)).toEqual(bobsList);
  });

  it('returns 401 without an access token', async () => {
    const created = await createList('To do');

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/lists/${created.id}`)
      .send({ title: 'Backlog' });

    expect(res.status).toBe(401);
    expect(await read(created.id)).toEqual(created);
  });
});
