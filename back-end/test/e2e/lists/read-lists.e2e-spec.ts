import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type ListBody = {
  id: string;
  title: string;
  position: number | null;
  archivedAt: string | null;
};

describe('GET /api/v1/boards/:boardId/lists and /api/v1/lists/:id (e2e)', () => {
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

  const createList = async (
    title: string,
    id = boardId,
    token = anaToken,
  ): Promise<ListBody> => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title })
      .expect(201);
    return res.body;
  };

  // The archive endpoints come later (T9), so archive straight in the table.
  // Only the last active list is archived, which keeps positions contiguous.
  const archiveList = async (id: string, archivedAt: string) => {
    await dataSource.query(
      'UPDATE "lists" SET "position" = NULL, "archived_at" = $2 WHERE "id" = $1',
      [id, archivedAt],
    );
  };

  const archiveBoard = async (id: string) => {
    await request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/archive`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
  };

  const get = (path: string, token = anaToken) =>
    request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .set('Authorization', `Bearer ${token}`);

  const titles = (res: request.Response): string[] =>
    res.body.map((list: ListBody) => list.title);

  const expectSameNotFound = (responses: request.Response[], type: string) => {
    const bodies = responses.map((res) => {
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      const { instance: _instance, requestId: _requestId, ...rest } = res.body;
      return rest;
    });
    expect(bodies[0].type).toBe(type);
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
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

  describe('GET /boards/:boardId/lists', () => {
    it('returns 200 with an empty array for a board without lists', async () => {
      const res = await get(`/boards/${boardId}/lists`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns only the board's active lists by position ascending", async () => {
      const todo = await createList('To do');
      await createList('Doing');
      await createList('Done');
      const archived = await createList('Old');
      await archiveList(archived.id, '2026-01-01T00:00:00.000Z');
      const otherBoardId = await createBoard(anaToken, 'Other');
      await createList('Elsewhere', otherBoardId);

      const res = await get(`/boards/${boardId}/lists`);

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['To do', 'Doing', 'Done']);
      expect(res.body.map((list: ListBody) => list.position)).toEqual([
        0, 1, 2,
      ]);
      expect(res.body[0]).toEqual(todo);
    });

    it('returns the same lists for archived=false as for no filter', async () => {
      await createList('To do');
      await createList('Doing');
      const archived = await createList('Old');
      await archiveList(archived.id, '2026-01-01T00:00:00.000Z');

      const res = await get(`/boards/${boardId}/lists?archived=false`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual((await get(`/boards/${boardId}/lists`)).body);
      expect(titles(res)).toEqual(['To do', 'Doing']);
    });

    it('still lists the active lists of an archived board', async () => {
      await createList('To do');
      await createList('Doing');
      await archiveBoard(boardId);

      const res = await get(`/boards/${boardId}/lists`);

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['To do', 'Doing']);
    });

    it('returns only archived lists, newest archivedAt first, for archived=true', async () => {
      await createList('Active');
      const older = await createList('Older');
      const newer = await createList('Newer');
      await archiveList(newer.id, '2026-02-01T00:00:00.000Z');
      await archiveList(older.id, '2026-01-01T00:00:00.000Z');

      const res = await get(`/boards/${boardId}/lists?archived=true`);

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['Newer', 'Older']);
      expect(res.body.map((list: ListBody) => list.position)).toEqual([
        null,
        null,
      ]);
      expect(res.body.map((list: ListBody) => list.archivedAt)).toEqual([
        '2026-02-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]);
    });

    it.each(['yes', '1', 'TRUE', ''])(
      'returns 400 with an archived field error for archived=%s',
      async (value) => {
        const res = await get(`/boards/${boardId}/lists?archived=${value}`);

        expect(res.status).toBe(400);
        expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            { field: 'archived', message: expect.any(String) },
          ]),
        );
      },
    );

    it("answers another user's, an unknown and a malformed board id with the same 404", async () => {
      const bobsBoardId = await createBoard(bobToken, 'Bob board');
      await createList('Bob list', bobsBoardId, bobToken);

      const responses = await Promise.all(
        [bobsBoardId, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
          get(`/boards/${id}/lists`),
        ),
      );

      expectSameNotFound(responses, '/problems/board-not-found');
    });

    it('returns 401 without an access token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/boards/${boardId}/lists`,
      );

      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    });
  });

  describe('GET /lists/:id', () => {
    it('returns 200 with an active list', async () => {
      const list = await createList('To do');

      const res = await get(`/lists/${list.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(list);
    });

    it('returns 200 with an archived list', async () => {
      const list = await createList('Old');
      await archiveList(list.id, '2026-01-01T00:00:00.000Z');

      const res = await get(`/lists/${list.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        ...list,
        position: null,
        archivedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: expect.any(String),
      });
    });

    it('returns 200 with a list of an archived board', async () => {
      const list = await createList('To do');
      await archiveBoard(boardId);

      const res = await get(`/lists/${list.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(list);
    });

    it("answers another user's, an unknown and a malformed list id with the same 404", async () => {
      const bobsBoardId = await createBoard(bobToken, 'Bob board');
      const bobsList = await createList('Bob list', bobsBoardId, bobToken);

      const responses = await Promise.all(
        [bobsList.id, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
          get(`/lists/${id}`),
        ),
      );

      expectSameNotFound(responses, '/problems/list-not-found');
    });

    it('returns 401 without an access token', async () => {
      const list = await createList('To do');

      const res = await request(app.getHttpServer()).get(
        `/api/v1/lists/${list.id}`,
      );

      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    });
  });
});
