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
  description: string | null;
  dueDate: string | null;
  done: boolean;
  position: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

describe('POST /api/v1/cards/:id/move (e2e)', () => {
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

  // The card archive endpoint comes later (T10), so archive straight in the
  // table. Only the last active card of a list is archived, which keeps
  // positions contiguous.
  const archiveCard = async (id: string) => {
    await dataSource.query(
      'UPDATE "cards" SET "position" = NULL, "archived_at" = now() WHERE "id" = $1',
      [id],
    );
  };

  const archive = async (path: string) => {
    await request(app.getHttpServer())
      .post(`/api/v1/${path}/archive`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
  };

  const move = (id: string, body: unknown, token = anaToken) =>
    request(app.getHttpServer())
      .post(`/api/v1/cards/${id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);

  const read = async (id: string, token = anaToken): Promise<CardBody> => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/cards/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  const cardsOf = async (id: string, token = anaToken): Promise<CardBody[]> => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/lists/${id}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  const titlesIn = async (id: string): Promise<string[]> =>
    (await cardsOf(id)).map((card) => card.title);

  const positionsIn = async (id: string): Promise<(number | null)[]> =>
    (await cardsOf(id)).map((card) => card.position);

  const expectConflict = (res: request.Response, type: string) => {
    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe(type);
  };

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

  it('moves a card up in its list and keeps updatedAt of the shifted cards', async () => {
    const [one, two, three] = await createCards(listId, '1', '2', '3');

    const res = await move(three.id, { position: 0 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...three,
      position: 0,
      updatedAt: expect.any(String),
    });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(three.updatedAt).getTime(),
    );
    const cards = await cardsOf(listId);
    expect(cards.map((card) => card.title)).toEqual(['3', '1', '2']);
    expect(cards.map((card) => card.position)).toEqual([0, 1, 2]);
    // Only the moved card gets a new updatedAt.
    expect(cards[1].updatedAt).toBe(one.updatedAt);
    expect(cards[2].updatedAt).toBe(two.updatedAt);
  });

  it('moves a card down in its list', async () => {
    const [, , three] = await createCards(listId, '1', '2', '3');
    await move(three.id, { position: 0 }).expect(200);

    const res = await move(three.id, { position: 2 });

    expect(res.status).toBe(200);
    expect(res.body.position).toBe(2);
    expect(await titlesIn(listId)).toEqual(['1', '2', '3']);
    expect(await positionsIn(listId)).toEqual([0, 1, 2]);
  });

  it("treats listId equal to the card's list as a same-list move", async () => {
    const [, , three] = await createCards(listId, '1', '2', '3');

    const res = await move(three.id, { listId, position: 0 });

    expect(res.status).toBe(200);
    expect(res.body.listId).toBe(listId);
    expect(res.body.position).toBe(0);
    expect(await titlesIn(listId)).toEqual(['3', '1', '2']);
  });

  it('clamps a same-list position past the end to the last index', async () => {
    const [one] = await createCards(listId, '1', '2', '3');

    const res = await move(one.id, { position: 99 });

    expect(res.status).toBe(200);
    expect(res.body.position).toBe(2);
    expect(await titlesIn(listId)).toEqual(['2', '3', '1']);
    expect(await positionsIn(listId)).toEqual([0, 1, 2]);
  });

  it('moves a card to another list and closes the gap in its list', async () => {
    const b = await createList('B');
    const [one] = await createCards(listId, '1', '2', '3');
    await createCards(b, '4');

    const res = await move(one.id, { listId: b, position: 0 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...one,
      listId: b,
      position: 0,
      updatedAt: expect.any(String),
    });
    expect(await titlesIn(listId)).toEqual(['2', '3']);
    expect(await positionsIn(listId)).toEqual([0, 1]);
    expect(await titlesIn(b)).toEqual(['1', '4']);
    expect(await positionsIn(b)).toEqual([0, 1]);
    expect(await read(one.id)).toEqual(res.body);
  });

  it('clamps a cross-list position past the end to the end of the target', async () => {
    const b = await createList('B');
    const [one] = await createCards(listId, '1', '2');
    await createCards(b, '3', '4');

    const res = await move(one.id, { listId: b, position: 99 });

    expect(res.status).toBe(200);
    expect(res.body.position).toBe(2);
    expect(await titlesIn(b)).toEqual(['3', '4', '1']);
    expect(await positionsIn(b)).toEqual([0, 1, 2]);
  });

  it('moves a card into an empty list at position 0', async () => {
    const b = await createList('B');
    const [one] = await createCards(listId, '1', '2');

    const res = await move(one.id, { listId: b, position: 5 });

    expect(res.status).toBe(200);
    expect(res.body.listId).toBe(b);
    expect(res.body.position).toBe(0);
    expect(await titlesIn(b)).toEqual(['1']);
    expect(await titlesIn(listId)).toEqual(['2']);
    expect(await positionsIn(listId)).toEqual([0]);
  });

  it('returns 200 with the identical card when it stays in place', async () => {
    const [, two] = await createCards(listId, '1', '2', '3');

    const res = await move(two.id, { position: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(two);
    expect(await read(two.id)).toEqual(two);
  });

  it.each([
    ['position is missing', {}, 'position'],
    ['position is negative', { position: -1 }, 'position'],
    ['position is not an integer', { position: 1.5 }, 'position'],
    ['position is a string', { position: '2' }, 'position'],
    ['listId is not a UUID', { listId: 'abc', position: 0 }, 'listId'],
  ])('returns 400 and keeps the order when %s', async (_, body, field) => {
    const [, , three] = await createCards(listId, '1', '2', '3');

    const res = await move(three.id, body);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field, message: expect.any(String) }]),
    );
    expect(await titlesIn(listId)).toEqual(['1', '2', '3']);
    expect(await read(three.id)).toEqual(three);
  });

  it.each([
    ['title', { title: 'Renamed' }],
    ['archivedAt', { archivedAt: '2026-11-01T10:00:00.000Z' }],
  ])(
    'returns 400 for the unknown property %s and keeps the order',
    async (_case, extra) => {
      const [, , three] = await createCards(listId, '1', '2', '3');

      const res = await move(three.id, { position: 0, ...extra });

      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(await titlesIn(listId)).toEqual(['1', '2', '3']);
      expect(await read(three.id)).toEqual(three);
    },
  );

  it("answers an unknown target, another user's list and another board's list with the same 404 and moves nothing", async () => {
    const [one] = await createCards(listId, '1', '2');
    const otherBoardId = await createBoard(anaToken, 'Other');
    const otherBoardList = await createList('Other', otherBoardId);
    const bobsBoardId = await createBoard(bobToken, 'Bob board');
    const bobsList = await createList('Bob list', bobsBoardId, bobToken);

    const responses = await Promise.all(
      [UNKNOWN_ID, bobsList, otherBoardList].map((target) =>
        move(one.id, { listId: target, position: 0 }),
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
    expect(await titlesIn(listId)).toEqual(['1', '2']);
    expect(await read(one.id)).toEqual(one);
    expect(await cardsOf(bobsList, bobToken)).toEqual([]);
    expect(await cardsOf(otherBoardList)).toEqual([]);
  });

  it('returns 409 list-archived for an archived target and moves nothing', async () => {
    const b = await createList('B');
    const [one] = await createCards(listId, '1', '2');
    await archive(`lists/${b}`);

    const res = await move(one.id, { listId: b, position: 0 });

    expectConflict(res, '/problems/list-archived');
    expect(await titlesIn(listId)).toEqual(['1', '2']);
    expect(await read(one.id)).toEqual(one);
    expect(await cardsOf(b)).toEqual([]);
  });

  it('returns 409 card-archived on an archived card and keeps it', async () => {
    const [, two] = await createCards(listId, '1', '2');
    await archiveCard(two.id);
    const before = await read(two.id);

    const res = await move(two.id, { position: 0 });

    expectConflict(res, '/problems/card-archived');
    expect(await read(two.id)).toEqual(before);
    expect(await titlesIn(listId)).toEqual(['1']);
  });

  it('returns 409 list-archived on a card of an archived list and keeps it', async () => {
    const [, two] = await createCards(listId, '1', '2');
    await archive(`lists/${listId}`);

    const res = await move(two.id, { position: 0 });

    expectConflict(res, '/problems/list-archived');
    expect(await read(two.id)).toEqual(two);
  });

  it('returns 409 board-archived on a card of an archived board and keeps it', async () => {
    const [, two] = await createCards(listId, '1', '2');
    await archive(`boards/${boardId}`);

    const res = await move(two.id, { position: 0 });

    expectConflict(res, '/problems/board-archived');
    expect(await read(two.id)).toEqual(two);
  });

  it("answers another user's, an unknown and a malformed id with the same 404 and keeps the foreign card", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');
    const bobsList = await createList('Bob list', bobsBoardId, bobToken);
    const bobsCard = await createCard('Bob card', bobsList, bobToken);

    const responses = await Promise.all(
      [bobsCard.id, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
        move(id, { position: 0 }),
      ),
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
    expect(await read(bobsCard.id, bobToken)).toEqual(bobsCard);
  });

  it('returns 401 without an access token', async () => {
    const [, two] = await createCards(listId, '1', '2');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/cards/${two.id}/move`)
      .send({ position: 0 });

    expect(res.status).toBe(401);
    expect(await read(two.id)).toEqual(two);
  });

  it('keeps contiguous positions under concurrent same-list and cross-list moves on one board', async () => {
    const b = await createList('B');
    const lists = [listId, b];
    const cards = [
      ...(await createCards(listId, '1', '2', '3', '4')),
      ...(await createCards(b, '5', '6', '7', '8')),
    ];

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        move(cards[i % 8].id, {
          listId: lists[i % 3 === 0 ? 1 : 0],
          position: (i * 3) % 5,
        }),
      ),
    );

    responses.forEach((res) => expect(res.status).toBe(200));
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
    expect(Number(total[0].count)).toBe(8);
  });
});
