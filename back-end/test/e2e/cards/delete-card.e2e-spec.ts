import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type Method = 'get' | 'post' | 'patch' | 'delete';

type CardBody = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  done: boolean;
  position: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// Every card route: [method, path, body].
const cardRoutes = (
  boardId: string,
  listId: string,
  cardId: string,
): [Method, string, object | undefined][] => [
  ['post', `/api/v1/lists/${listId}/cards`, { title: 'Intruder' }],
  ['get', `/api/v1/lists/${listId}/cards`, undefined],
  ['get', `/api/v1/boards/${boardId}/cards`, undefined],
  ['get', `/api/v1/cards/${cardId}`, undefined],
  ['patch', `/api/v1/cards/${cardId}`, { title: 'Hacked' }],
  ['post', `/api/v1/cards/${cardId}/move`, { position: 0 }],
  ['post', `/api/v1/cards/${cardId}/archive`, undefined],
  ['post', `/api/v1/cards/${cardId}/unarchive`, undefined],
  ['delete', `/api/v1/cards/${cardId}`, undefined],
];

describe('DELETE /api/v1/cards/:id (e2e)', () => {
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

  const createCards = async (
    id: string,
    ...titles: string[]
  ): Promise<CardBody[]> => {
    const cards: CardBody[] = [];
    for (const title of titles) {
      cards.push(await createCard(title, id));
    }
    return cards;
  };

  const post = (path: string, body?: object, token = anaToken) =>
    request(app.getHttpServer())
      .post(`/api/v1/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const archive = async (id: string, token = anaToken): Promise<CardBody> =>
    (await post(`cards/${id}/archive`, undefined, token).expect(200)).body;

  const remove = (id: string, token = anaToken) =>
    request(app.getHttpServer())
      .delete(`/api/v1/cards/${id}`)
      .set('Authorization', `Bearer ${token}`);

  const read = (id: string, token = anaToken) =>
    request(app.getHttpServer())
      .get(`/api/v1/cards/${id}`)
      .set('Authorization', `Bearer ${token}`);

  const cardsOf = async (
    id = listId,
    query = '',
    token = anaToken,
  ): Promise<CardBody[]> => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/lists/${id}/cards${query}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  const titlesAndPositions = async (id = listId) =>
    (await cardsOf(id)).map((card) => [card.title, card.position]);

  beforeEach(async () => {
    anaToken = await register('Ana', 'ana@example.com');
    bobToken = await register('Bob', 'bob@example.com');
    boardId = await createBoard(anaToken, 'Roadmap');
    listId = await createList('A');
  });

  // Deleting the owner cascades to their boards, lists and cards (CRD-40).
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects deleting an active card with 409 and keeps it', async () => {
    const [one] = await createCards(listId, '1');

    const res = await remove(one.id);

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/card-not-archived');
    expect((await read(one.id).expect(200)).body).toEqual(one);
  });

  it('deletes an archived card with 204 and an empty body', async () => {
    const [, two] = await createCards(listId, '1', '2', '3');
    await archive(two.id);

    const res = await remove(two.id);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    const after = await read(two.id);
    expect(after.status).toBe(404);
    expect(after.body.type).toBe('/problems/card-not-found');
    expect(await titlesAndPositions()).toEqual([
      ['1', 0],
      ['3', 1],
    ]);
    expect(await cardsOf(listId, '?archived=true')).toEqual([]);
  });

  it.each([
    ['lists', '/problems/list-archived'],
    ['boards', '/problems/board-archived'],
  ])(
    'returns 409 on an archived card of an archived %s and keeps it',
    async (parent, type) => {
      const [one] = await createCards(listId, '1');
      const archived = await archive(one.id);
      await post(
        `${parent}/${parent === 'lists' ? listId : boardId}/archive`,
      ).expect(200);

      const res = await remove(one.id);

      expect(res.status).toBe(409);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.type).toBe(type);
      expect((await read(one.id).expect(200)).body).toEqual(archived);
    },
  );

  it("leaves the cards' position, archivedAt and updatedAt unchanged when their list is archived and unarchived", async () => {
    const [, two] = await createCards(listId, '1', '2', '3');
    await archive(two.id);
    const active = await cardsOf();
    const archived = await cardsOf(listId, '?archived=true');

    await post(`lists/${listId}/archive`).expect(200);
    await post(`lists/${listId}/unarchive`).expect(200);

    expect(await cardsOf()).toEqual(active);
    expect(await cardsOf(listId, '?archived=true')).toEqual(archived);
  });

  it('deletes the active and archived cards of a deleted list', async () => {
    const [one, two] = await createCards(listId, '1', '2');
    await archive(two.id);
    await post(`lists/${listId}/archive`).expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(204);

    for (const id of [one.id, two.id]) {
      const res = await read(id);
      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/problems/card-not-found');
    }
  });

  it('keeps contiguous positions under concurrent create, move, archive, unarchive and delete on one board', async () => {
    const b = await createList('B');
    const lists = [listId, b];
    const a = await createCards(listId, '1', '2', '3', '4', '5', '6');
    const inB = await createCards(b, '7', '8', '9', '10');
    const toUnarchive = [await archive(a[5].id), await archive(inB[3].id)];
    const toDelete = await archive(a[4].id);

    // Each request touches its own card, so every one succeeds.
    const responses = await Promise.all([
      post(`lists/${listId}/cards`, { title: 'new A' }),
      post(`lists/${b}/cards`, { title: 'new B' }),
      post(`cards/${a[0].id}/move`, { position: 3 }),
      post(`cards/${inB[0].id}/move`, { position: 2 }),
      post(`cards/${a[1].id}/move`, { listId: b, position: 0 }),
      post(`cards/${inB[1].id}/move`, { listId, position: 1 }),
      post(`cards/${a[2].id}/archive`),
      post(`cards/${inB[2].id}/archive`),
      ...toUnarchive.map((card) => post(`cards/${card.id}/unarchive`)),
      remove(toDelete.id),
    ]);

    expect(responses.map((res) => res.status)).toEqual([
      201, 201, 200, 200, 200, 200, 200, 200, 200, 200, 204,
    ]);
    for (const id of lists) {
      const rows: { position: number }[] = await dataSource.query(
        'SELECT "position" FROM "cards" WHERE "list_id" = $1 AND "archived_at" IS NULL ORDER BY "position"',
        [id],
      );
      expect(rows.map((row) => row.position)).toEqual(
        Array.from({ length: rows.length }, (_, i) => i),
      );
    }
    const total: { count: string }[] = await dataSource.query(
      'SELECT count(*) AS "count" FROM "cards" WHERE "list_id" = ANY($1) AND "archived_at" IS NULL',
      [lists],
    );
    // 10 created - 3 pre-archived + 2 new - 2 archived + 2 unarchived.
    expect(Number(total[0].count)).toBe(9);
  });

  it("answers another user's, an unknown and a malformed id with the same 404 and keeps the foreign card", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');
    const bobsList = await createList('Bob A', bobsBoardId, bobToken);
    const bobsCard = await createCard('Bob 1', bobsList, bobToken);
    const archived = await archive(bobsCard.id, bobToken);

    const responses = await Promise.all(
      [bobsCard.id, UNKNOWN_ID, 'not-a-uuid'].map((id) => remove(id)),
    );

    const bodies = responses.map((res) => {
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      const { instance: _instance, requestId: _requestId, ...rest } = res.body;
      return rest;
    });
    expect(bodies[0].type).toBe('/problems/card-not-found');
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    expect((await read(bobsCard.id, bobToken).expect(200)).body).toEqual(
      archived,
    );
  });

  it("answers every card route on another user's data with 404 and changes nothing", async () => {
    const [one, two] = await createCards(listId, '1', '2');
    const archivedTwo = await archive(two.id);

    for (const [method, path, body] of [
      ...cardRoutes(boardId, listId, one.id),
      ['delete', `/api/v1/cards/${two.id}`, undefined] as const,
    ]) {
      const res = await request(app.getHttpServer())
        [method](path)
        .set('Authorization', `Bearer ${bobToken}`)
        .send(body);

      expect([method, path, res.status]).toEqual([method, path, 404]);
      expect(res.body.type).toBe(
        path.startsWith('/api/v1/boards/')
          ? '/problems/board-not-found'
          : path.startsWith('/api/v1/lists/')
            ? '/problems/list-not-found'
            : '/problems/card-not-found',
      );
    }

    expect(await cardsOf()).toEqual([one]);
    expect(await cardsOf(listId, '?archived=true')).toEqual([archivedTwo]);
  });

  it('returns 401 on every card route without an access token and changes nothing', async () => {
    const [one] = await createCards(listId, '1');

    for (const [method, path, body] of cardRoutes(boardId, listId, one.id)) {
      const res = await request(app.getHttpServer())[method](path).send(body);

      expect([method, path, res.status]).toEqual([method, path, 401]);
    }

    expect(await cardsOf()).toEqual([one]);
  });

  it('runs the create, move, done, archive and delete lifecycle with contiguous positions', async () => {
    const b = await createList('B');
    const [one] = await createCards(listId, '1', '2', '3');
    await createCards(b, '4');

    await post(`cards/${one.id}/move`, { listId: b, position: 0 }).expect(200);
    expect(await titlesAndPositions()).toEqual([
      ['2', 0],
      ['3', 1],
    ]);
    expect(await titlesAndPositions(b)).toEqual([
      ['1', 0],
      ['4', 1],
    ]);

    await request(app.getHttpServer())
      .patch(`/api/v1/cards/${one.id}`)
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ done: true })
      .expect(200);
    expect(await titlesAndPositions(b)).toEqual([
      ['1', 0],
      ['4', 1],
    ]);

    await archive(one.id);
    expect(await titlesAndPositions(b)).toEqual([['4', 0]]);

    await remove(one.id).expect(204);
    expect(await titlesAndPositions()).toEqual([
      ['2', 0],
      ['3', 1],
    ]);
    expect(await titlesAndPositions(b)).toEqual([['4', 0]]);
    expect(await cardsOf(b, '?archived=true')).toEqual([]);
    await read(one.id).expect(404);
  });
});
