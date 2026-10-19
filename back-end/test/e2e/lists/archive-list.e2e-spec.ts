import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('POST /api/v1/lists/:id/archive and /unarchive (e2e)', () => {
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

  const unarchiveBoard = async (id: string) => {
    await request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/unarchive`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
  };

  const action = (
    id: string,
    name: 'archive' | 'unarchive',
    token = anaToken,
  ) =>
    request(app.getHttpServer())
      .post(`/api/v1/lists/${id}/${name}`)
      .set('Authorization', `Bearer ${token}`);

  const read = async (id: string, token = anaToken) => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/lists/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  const listsInBoard = async (query = '') => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/boards/${boardId}/lists${query}`)
      .set('Authorization', `Bearer ${anaToken}`)
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

  it('archives a list, closes the gap and lists it as archived', async () => {
    const [a] = await createLists('A', 'B', 'C');
    const start = Date.now();

    const res = await action(a.id, 'archive');

    const end = Date.now();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...a,
      position: null,
      archivedAt: expect.stringMatching(ISO_DATE),
      updatedAt: expect.any(String),
    });
    const archivedAt = new Date(res.body.archivedAt).getTime();
    expect(archivedAt).toBeGreaterThanOrEqual(start);
    expect(archivedAt).toBeLessThanOrEqual(end);
    const active = await listsInBoard();
    expect(
      active.map((list: { title: string; position: number }) => [
        list.title,
        list.position,
      ]),
    ).toEqual([
      ['B', 0],
      ['C', 1],
    ]);
    expect(await listsInBoard('?archived=true')).toEqual([res.body]);
  });

  it('returns 200 with the original archivedAt when archiving again', async () => {
    const [a] = await createLists('A', 'B');
    const archived = (await action(a.id, 'archive').expect(200)).body;

    const res = await action(a.id, 'archive');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(archived);
    expect(await read(a.id)).toEqual(archived);
  });

  it('unarchives a list to the end of the active lists', async () => {
    const [a] = await createLists('A', 'B', 'C');
    const archived = (await action(a.id, 'archive').expect(200)).body;

    const res = await action(a.id, 'unarchive');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...archived,
      position: 2,
      archivedAt: null,
      updatedAt: expect.any(String),
    });
    const active = await listsInBoard();
    expect(active.map((list: { title: string }) => list.title)).toEqual([
      'B',
      'C',
      'A',
    ]);
    expect(await listsInBoard('?archived=true')).toEqual([]);
  });

  it('returns 200 with the identical list when unarchiving an active list', async () => {
    const [, b] = await createLists('A', 'B');

    const res = await action(b.id, 'unarchive');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(b);
    expect(await read(b.id)).toEqual(b);
  });

  // Every list state, including the ones where the list-state branch would
  // otherwise no-op with 200 (LST-26).
  it.each([
    ['archive' as const, 'an active'],
    ['archive' as const, 'an archived'],
    ['unarchive' as const, 'an active'],
    ['unarchive' as const, 'an archived'],
  ])(
    'returns 409 board-archived on %s of %s list of an archived board',
    async (name, state) => {
      const [a] = await createLists('A', 'B');
      if (state === 'an archived') {
        await action(a.id, 'archive').expect(200);
      }
      const before = await read(a.id);
      await archiveBoard(boardId);

      const res = await action(a.id, name);

      expect(res.status).toBe(409);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.type).toBe('/problems/board-archived');
      await unarchiveBoard(boardId);
      expect(await read(a.id)).toEqual(before);
    },
  );

  it.each([['archive' as const], ['unarchive' as const]])(
    "answers %s of another user's, an unknown and a malformed id with the same 404",
    async (name) => {
      const bobsBoardId = await createBoard(bobToken, 'Bob board');
      const bobsList = await createList('Bob 1', bobsBoardId, bobToken);

      const responses = await Promise.all(
        [bobsList.id, UNKNOWN_ID, 'not-a-uuid'].map((id) => action(id, name)),
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
      expect(bodies[0].type).toBe('/problems/list-not-found');
      expect(bodies[1]).toEqual(bodies[0]);
      expect(bodies[2]).toEqual(bodies[0]);
      expect(await read(bobsList.id, bobToken)).toEqual(bobsList);
    },
  );

  it.each([['archive'], ['unarchive']])(
    'returns 401 on %s without an access token',
    async (name) => {
      const [a] = await createLists('A');

      const res = await request(app.getHttpServer()).post(
        `/api/v1/lists/${a.id}/${name}`,
      );

      expect(res.status).toBe(401);
      expect(await read(a.id)).toEqual(a);
    },
  );
});
