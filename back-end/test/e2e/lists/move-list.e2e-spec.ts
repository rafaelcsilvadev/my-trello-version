import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('POST /api/v1/lists/:id/move (e2e)', () => {
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

  const createLists = async (...titles: string[]) => {
    const lists = [];
    for (const title of titles) {
      lists.push(await createList(title));
    }
    return lists;
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

  const move = (id: string, body: unknown, token = anaToken) =>
    request(app.getHttpServer())
      .post(`/api/v1/lists/${id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);

  const read = async (id: string, token = anaToken) => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/lists/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  const activeLists = async (id = boardId) => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/boards/${id}/lists`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
    return res.body;
  };

  const titlesInOrder = async () =>
    (await activeLists()).map((list: { title: string }) => list.title);

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

  it('moves a list up and shifts the others down keeping their order', async () => {
    const [a, b, c, d] = await createLists('A', 'B', 'C', 'D');

    const res = await move(c.id, { position: 0 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...c,
      position: 0,
      updatedAt: expect.any(String),
    });
    const lists = await activeLists();
    expect(lists.map((list: { title: string }) => list.title)).toEqual([
      'C',
      'A',
      'B',
      'D',
    ]);
    expect(lists.map((list: { position: number }) => list.position)).toEqual([
      0, 1, 2, 3,
    ]);
    // Only the moved list gets a new updatedAt.
    expect(lists[1].updatedAt).toBe(a.updatedAt);
    expect(lists[2].updatedAt).toBe(b.updatedAt);
    expect(lists[3].updatedAt).toBe(d.updatedAt);
  });

  it('moves a list down and shifts the others up keeping their order', async () => {
    const [a, b, c, d] = await createLists('A', 'B', 'C', 'D');

    const res = await move(a.id, { position: 3 });

    expect(res.status).toBe(200);
    expect(res.body.position).toBe(3);
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(a.updatedAt).getTime(),
    );
    const lists = await activeLists();
    expect(lists.map((list: { title: string }) => list.title)).toEqual([
      'B',
      'C',
      'D',
      'A',
    ]);
    expect(lists.map((list: { position: number }) => list.position)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(lists[0].updatedAt).toBe(b.updatedAt);
    expect(lists[1].updatedAt).toBe(c.updatedAt);
    expect(lists[2].updatedAt).toBe(d.updatedAt);
  });

  it('moves the list to the end when position is past the last index', async () => {
    const [a] = await createLists('A', 'B', 'C');

    const res = await move(a.id, { position: 99 });

    expect(res.status).toBe(200);
    expect(res.body.position).toBe(2);
    expect(await titlesInOrder()).toEqual(['B', 'C', 'A']);
  });

  it('returns 200 with the identical list when position is unchanged', async () => {
    const [, b] = await createLists('A', 'B', 'C');

    const res = await move(b.id, { position: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(b);
    expect(await read(b.id)).toEqual(b);
  });

  it('keeps the only list at position 0', async () => {
    const [only] = await createLists('Only');

    const res = await move(only.id, { position: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(only);
  });

  it.each([
    ['position is missing', {}],
    ['position is negative', { position: -1 }],
    ['position is not an integer', { position: 1.5 }],
    ['position is a string', { position: '2' }],
    ['position is null', { position: null }],
  ])('returns 400 and keeps the order when %s', async (_, body) => {
    const [a] = await createLists('A', 'B', 'C');

    const res = await move(a.id, body);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'position', message: expect.any(String) },
      ]),
    );
    expect(await titlesInOrder()).toEqual(['A', 'B', 'C']);
  });

  it('returns 400 for an unknown property and keeps the order', async () => {
    const [a] = await createLists('A', 'B');

    const res = await move(a.id, { position: 1, title: 'X' });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await titlesInOrder()).toEqual(['A', 'B']);
  });

  it('returns 409 list-archived on an archived list and keeps the order', async () => {
    const [old] = await createLists('Old', 'A', 'B');
    await archiveList(old.id);
    await dataSource.query(
      'UPDATE "lists" SET "position" = "position" - 1 WHERE "board_id" = $1 AND "archived_at" IS NULL',
      [boardId],
    );
    const before = await read(old.id);

    const res = await move(old.id, { position: 0 });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/list-archived');
    expect(await read(old.id)).toEqual(before);
    expect(await titlesInOrder()).toEqual(['A', 'B']);
  });

  it('returns 409 board-archived on a list of an archived board and keeps the order', async () => {
    const [, b] = await createLists('A', 'B');
    await archiveBoard(boardId);

    const res = await move(b.id, { position: 0 });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/board-archived');
    expect(await titlesInOrder()).toEqual(['A', 'B']);
  });

  it("answers another user's, an unknown and a malformed id with the same 404 and keeps the foreign order", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');
    const bobsFirst = await createList('Bob 1', bobsBoardId, bobToken);
    const bobsSecond = await createList('Bob 2', bobsBoardId, bobToken);

    const responses = await Promise.all(
      [bobsSecond.id, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
        move(id, { position: 0 }),
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
    expect(await read(bobsFirst.id, bobToken)).toEqual(bobsFirst);
    expect(await read(bobsSecond.id, bobToken)).toEqual(bobsSecond);
  });

  it('returns 401 without an access token', async () => {
    const [a] = await createLists('A', 'B');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/lists/${a.id}/move`)
      .send({ position: 1 });

    expect(res.status).toBe(401);
    expect(await titlesInOrder()).toEqual(['A', 'B']);
  });

  it('keeps contiguous positions under concurrent moves on one board', async () => {
    const lists = await createLists('A', 'B', 'C', 'D', 'E');

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        move(lists[i % 5].id, { position: (i * 3) % 5 }),
      ),
    );

    responses.forEach((res) => expect(res.status).toBe(200));
    const rows: { position: number }[] = await dataSource.query(
      'SELECT "position" FROM "lists" WHERE "board_id" = $1 AND "archived_at" IS NULL ORDER BY "position"',
      [boardId],
    );
    expect(rows.map((row) => row.position)).toEqual([0, 1, 2, 3, 4]);
  });
});
