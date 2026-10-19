import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type Method = 'get' | 'post' | 'patch' | 'delete';

// Every list route: [method, path, body].
const listRoutes = (
  boardId: string,
  listId: string,
): [Method, string, object | undefined][] => [
  ['post', `/api/v1/boards/${boardId}/lists`, { title: 'Intruder' }],
  ['get', `/api/v1/boards/${boardId}/lists`, undefined],
  ['get', `/api/v1/lists/${listId}`, undefined],
  ['patch', `/api/v1/lists/${listId}`, { title: 'Hacked' }],
  ['post', `/api/v1/lists/${listId}/move`, { position: 0 }],
  ['post', `/api/v1/lists/${listId}/archive`, undefined],
  ['post', `/api/v1/lists/${listId}/unarchive`, undefined],
  ['delete', `/api/v1/lists/${listId}`, undefined],
];

describe('DELETE /api/v1/lists/:id (e2e)', () => {
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

  const archiveBoard = async (id: string) => {
    await request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/archive`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
  };

  const archive = async (id: string, token = anaToken) => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/lists/${id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  const move = async (id: string, position: number) => {
    await request(app.getHttpServer())
      .post(`/api/v1/lists/${id}/move`)
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ position })
      .expect(200);
  };

  const remove = (id: string, token = anaToken) =>
    request(app.getHttpServer())
      .delete(`/api/v1/lists/${id}`)
      .set('Authorization', `Bearer ${token}`);

  const read = (id: string, token = anaToken) =>
    request(app.getHttpServer())
      .get(`/api/v1/lists/${id}`)
      .set('Authorization', `Bearer ${token}`);

  const listsInBoard = async (query = '') => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/boards/${boardId}/lists${query}`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
    return res.body;
  };

  const titlesAndPositions = async () =>
    (await listsInBoard()).map((list: { title: string; position: number }) => [
      list.title,
      list.position,
    ]);

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

  it('rejects deleting an active list with 409 and keeps it', async () => {
    const [a] = await createLists('A');

    const res = await remove(a.id);

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/list-not-archived');
    expect((await read(a.id).expect(200)).body).toEqual(a);
  });

  it('deletes an archived list with 204 and an empty body', async () => {
    const [, b] = await createLists('A', 'B', 'C');
    await archive(b.id);

    const res = await remove(b.id);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    const after = await read(b.id);
    expect(after.status).toBe(404);
    expect(after.body.type).toBe('/problems/list-not-found');
    expect(await titlesAndPositions()).toEqual([
      ['A', 0],
      ['C', 1],
    ]);
    expect(await listsInBoard('?archived=true')).toEqual([]);
  });

  it('returns 409 board-archived on an archived list of an archived board and keeps it', async () => {
    const [a] = await createLists('A');
    const archived = await archive(a.id);
    await archiveBoard(boardId);

    const res = await remove(a.id);

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/board-archived');
    expect((await read(a.id).expect(200)).body).toEqual(archived);
  });

  it("answers another user's, an unknown and a malformed id with the same 404 and keeps the foreign list", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');
    const bobsList = await createList('Bob 1', bobsBoardId, bobToken);
    const archived = await archive(bobsList.id, bobToken);

    const responses = await Promise.all(
      [bobsList.id, UNKNOWN_ID, 'not-a-uuid'].map((id) => remove(id)),
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
    expect((await read(bobsList.id, bobToken).expect(200)).body).toEqual(
      archived,
    );
  });

  it("answers every list route on another user's data with 404 and changes nothing", async () => {
    const [a, b] = await createLists('A', 'B');
    const archivedB = await archive(b.id);

    for (const [method, path, body] of [
      ...listRoutes(boardId, a.id),
      ['delete', `/api/v1/lists/${b.id}`, undefined] as const,
    ]) {
      const res = await request(app.getHttpServer())
        [method](path)
        .set('Authorization', `Bearer ${bobToken}`)
        .send(body);

      expect([method, path, res.status]).toEqual([method, path, 404]);
      expect(res.body.type).toBe(
        path.startsWith('/api/v1/boards/')
          ? '/problems/board-not-found'
          : '/problems/list-not-found',
      );
    }

    expect(await listsInBoard()).toEqual([a]);
    expect(await listsInBoard('?archived=true')).toEqual([archivedB]);
  });

  it('returns 401 on every list route without an access token and changes nothing', async () => {
    const [a] = await createLists('A');

    for (const [method, path, body] of listRoutes(boardId, a.id)) {
      const res = await request(app.getHttpServer())[method](path).send(body);

      expect([method, path, res.status]).toEqual([method, path, 401]);
    }

    expect(await listsInBoard()).toEqual([a]);
  });

  it('runs the create, move, archive and delete lifecycle with contiguous positions', async () => {
    const [a, , c] = await createLists('A', 'B', 'C');
    expect(await titlesAndPositions()).toEqual([
      ['A', 0],
      ['B', 1],
      ['C', 2],
    ]);

    await move(c.id, 0);
    expect(await titlesAndPositions()).toEqual([
      ['C', 0],
      ['A', 1],
      ['B', 2],
    ]);

    await archive(a.id);
    expect(await titlesAndPositions()).toEqual([
      ['C', 0],
      ['B', 1],
    ]);

    await remove(a.id).expect(204);
    expect(await titlesAndPositions()).toEqual([
      ['C', 0],
      ['B', 1],
    ]);
    expect(await listsInBoard('?archived=true')).toEqual([]);
    await read(a.id).expect(404);
  });
});
