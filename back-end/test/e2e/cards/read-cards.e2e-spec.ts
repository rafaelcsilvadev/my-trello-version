import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type CardBody = {
  id: string;
  listId: string;
  title: string;
  position: number | null;
  archivedAt: string | null;
};

describe('GET /api/v1/lists/:listId/cards, /api/v1/boards/:boardId/cards and /api/v1/cards/:id (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let anaToken: string;
  let bobToken: string;
  let boardId: string;
  let listId: string;

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
  ): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title })
      .expect(201);
    return res.body.id;
  };

  const createCard = async (
    title: string,
    id = listId,
    token = anaToken,
  ): Promise<CardBody> => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/lists/${id}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title })
      .expect(201);
    return res.body;
  };

  // The card archive endpoint comes later (T10), so archive straight in the
  // table. Only the last active card of a list is archived, which keeps
  // positions contiguous.
  const archiveCard = async (id: string, archivedAt: string) => {
    await dataSource.query(
      'UPDATE "cards" SET "position" = NULL, "archived_at" = $2 WHERE "id" = $1',
      [id, archivedAt],
    );
  };

  const archive = async (path: string) => {
    await request(app.getHttpServer())
      .post(`/api/v1/${path}/archive`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
  };

  const get = (path: string, token = anaToken) =>
    request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .set('Authorization', `Bearer ${token}`);

  const titles = (res: request.Response): string[] =>
    res.body.map((card: CardBody) => card.title);

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
    listId = await createList('To do');
  });

  // Deleting the owner cascades to their boards, lists and cards (CRD-40).
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /lists/:listId/cards', () => {
    it('returns 200 with an empty array for a list without cards', async () => {
      const res = await get(`/lists/${listId}/cards`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns only the list's active cards by position ascending", async () => {
      const first = await createCard('Write spec');
      await createCard('Design');
      await createCard('Build');
      const archived = await createCard('Old');
      await archiveCard(archived.id, '2026-01-01T00:00:00.000Z');
      await createCard('Elsewhere', await createList('Doing'));

      const res = await get(`/lists/${listId}/cards`);

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['Write spec', 'Design', 'Build']);
      expect(res.body.map((card: CardBody) => card.position)).toEqual([
        0, 1, 2,
      ]);
      expect(res.body[0]).toEqual(first);
    });

    it('returns the same cards for archived=false as for no filter', async () => {
      await createCard('Write spec');
      await createCard('Design');
      const archived = await createCard('Old');
      await archiveCard(archived.id, '2026-01-01T00:00:00.000Z');

      const res = await get(`/lists/${listId}/cards?archived=false`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual((await get(`/lists/${listId}/cards`)).body);
      expect(titles(res)).toEqual(['Write spec', 'Design']);
    });

    it('still lists the active cards of an archived list', async () => {
      await createCard('Write spec');
      await createCard('Design');
      await archive(`lists/${listId}`);

      const res = await get(`/lists/${listId}/cards`);

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['Write spec', 'Design']);
    });

    it('still lists the active cards of a list of an archived board', async () => {
      await createCard('Write spec');
      await createCard('Design');
      await archive(`boards/${boardId}`);

      const res = await get(`/lists/${listId}/cards`);

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['Write spec', 'Design']);
    });

    it('returns only archived cards, newest archivedAt first, for archived=true', async () => {
      await createCard('Active');
      const older = await createCard('Older');
      const newer = await createCard('Newer');
      await archiveCard(newer.id, '2026-02-01T00:00:00.000Z');
      await archiveCard(older.id, '2026-01-01T00:00:00.000Z');

      const res = await get(`/lists/${listId}/cards?archived=true`);

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['Newer', 'Older']);
      expect(res.body.map((card: CardBody) => card.position)).toEqual([
        null,
        null,
      ]);
      expect(res.body.map((card: CardBody) => card.archivedAt)).toEqual([
        '2026-02-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]);
    });

    it("answers another user's, an unknown and a malformed list id with the same 404", async () => {
      const bobsListId = await createList(
        'Bob list',
        await createBoard(bobToken, 'Bob board'),
        bobToken,
      );
      await createCard('Bob card', bobsListId, bobToken);

      const responses = await Promise.all(
        [bobsListId, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
          get(`/lists/${id}/cards`),
        ),
      );

      expectSameNotFound(responses, '/problems/list-not-found');
    });

    it('returns 401 without an access token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/lists/${listId}/cards`,
      );

      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    });
  });

  describe('GET /boards/:boardId/cards', () => {
    it('returns the active cards of the active lists by list position, then card position', async () => {
      const doingId = await createList('Doing');
      const oldListId = await createList('Old list');
      await createCard('B1', doingId);
      await createCard('A1');
      await createCard('B2', doingId);
      await createCard('A2');
      const archived = await createCard('A3');
      await archiveCard(archived.id, '2026-01-01T00:00:00.000Z');
      await createCard('Hidden', oldListId);
      await archive(`lists/${oldListId}`);
      const otherBoardId = await createBoard(anaToken, 'Other');
      await createCard(
        'Elsewhere',
        await createList('Other list', otherBoardId),
      );

      const res = await get(`/boards/${boardId}/cards`);

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['A1', 'A2', 'B1', 'B2']);
      expect(res.body.map((card: CardBody) => card.listId)).toEqual([
        listId,
        listId,
        doingId,
        doingId,
      ]);
      expect(res.body.map((card: CardBody) => card.position)).toEqual([
        0, 1, 0, 1,
      ]);
    });

    it('returns the same cards for archived=false as for no filter', async () => {
      await createCard('A1');
      await createCard('B1', await createList('Doing'));
      const archived = await createCard('A2');
      await archiveCard(archived.id, '2026-01-01T00:00:00.000Z');

      const res = await get(`/boards/${boardId}/cards?archived=false`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual((await get(`/boards/${boardId}/cards`)).body);
      expect(titles(res)).toEqual(['A1', 'B1']);
    });

    it('still lists the cards of an archived board', async () => {
      await createCard('A1');
      await createCard('B1', await createList('Doing'));
      await archive(`boards/${boardId}`);

      const res = await get(`/boards/${boardId}/cards`);

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['A1', 'B1']);
    });

    it('returns the archived cards of every list, newest archivedAt first, for archived=true', async () => {
      const oldListId = await createList('Old list');
      await createCard('Active');
      const inList = await createCard('In list');
      const inOldList = await createCard('In old list', oldListId);
      await archiveCard(inList.id, '2026-01-01T00:00:00.000Z');
      await archiveCard(inOldList.id, '2026-02-01T00:00:00.000Z');
      await archive(`lists/${oldListId}`);
      const otherBoardId = await createBoard(anaToken, 'Other');
      const elsewhere = await createCard(
        'Elsewhere',
        await createList('Other list', otherBoardId),
      );
      await archiveCard(elsewhere.id, '2026-03-01T00:00:00.000Z');

      const res = await get(`/boards/${boardId}/cards?archived=true`);

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['In old list', 'In list']);
      expect(res.body.map((card: CardBody) => card.archivedAt)).toEqual([
        '2026-02-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]);
    });

    it("answers another user's, an unknown and a malformed board id with the same 404", async () => {
      const bobsBoardId = await createBoard(bobToken, 'Bob board');
      await createCard(
        'Bob card',
        await createList('Bob list', bobsBoardId, bobToken),
        bobToken,
      );

      const responses = await Promise.all(
        [bobsBoardId, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
          get(`/boards/${id}/cards`),
        ),
      );

      expectSameNotFound(responses, '/problems/board-not-found');
    });

    it('returns 401 without an access token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/boards/${boardId}/cards`,
      );

      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    });
  });

  describe.each([
    ['lists/:listId/cards', () => `/lists/${listId}/cards`],
    ['boards/:boardId/cards', () => `/boards/${boardId}/cards`],
  ])('the archived filter on GET %s', (_route, path) => {
    it.each(['yes', '1', 'TRUE', ''])(
      'returns 400 with an archived field error for archived=%s',
      async (value) => {
        const res = await get(`${path()}?archived=${value}`);

        expect(res.status).toBe(400);
        expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            { field: 'archived', message: expect.any(String) },
          ]),
        );
      },
    );
  });

  describe('GET /cards/:id', () => {
    it('returns 200 with an active card', async () => {
      const card = await createCard('Write spec');

      const res = await get(`/cards/${card.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(card);
    });

    it('returns 200 with an archived card', async () => {
      const card = await createCard('Old');
      await archiveCard(card.id, '2026-01-01T00:00:00.000Z');

      const res = await get(`/cards/${card.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        ...card,
        position: null,
        archivedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('returns 200 with a card of an archived list', async () => {
      const card = await createCard('Write spec');
      await archive(`lists/${listId}`);

      const res = await get(`/cards/${card.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(card);
    });

    it('returns 200 with a card of an archived board', async () => {
      const card = await createCard('Write spec');
      await archive(`boards/${boardId}`);

      const res = await get(`/cards/${card.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(card);
    });

    it("answers another user's, an unknown and a malformed card id with the same 404", async () => {
      const bobsCard = await createCard(
        'Bob card',
        await createList(
          'Bob list',
          await createBoard(bobToken, 'Bob board'),
          bobToken,
        ),
        bobToken,
      );

      const responses = await Promise.all(
        [bobsCard.id, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
          get(`/cards/${id}`),
        ),
      );

      expectSameNotFound(responses, '/problems/card-not-found');
    });

    it('returns 401 without an access token', async () => {
      const card = await createCard('Write spec');

      const res = await request(app.getHttpServer()).get(
        `/api/v1/cards/${card.id}`,
      );

      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    });
  });
});
