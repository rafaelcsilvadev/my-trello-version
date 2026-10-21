import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type ItemBody = {
  id: string;
  cardId: string;
  text: string;
  done: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

describe('POST /api/v1/checklist-items/:id/move (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let anaToken: string;
  let bobToken: string;
  let boardId: string;
  let listId: string;
  let cardId: string;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  const send = (
    method: 'get' | 'post',
    path: string,
    body?: unknown,
    token = anaToken,
  ) =>
    request(app.getHttpServer())
      [method](`/api/v1${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);

  const register = async (name: string, email: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name, email, password: 'correct horse' })
      .expect(201);
    return res.body.accessToken;
  };

  const createItems = async (...texts: string[]): Promise<ItemBody[]> => {
    const items: ItemBody[] = [];
    for (const text of texts) {
      const res = await send('post', `/cards/${cardId}/checklist-items`, {
        text,
      }).expect(201);
      items.push(res.body);
    }
    return items;
  };

  beforeEach(async () => {
    anaToken = await register('Ana', 'ana@example.com');
    bobToken = await register('Bob', 'bob@example.com');
    boardId = (await send('post', '/boards', { title: 'Roadmap' }).expect(201))
      .body.id;
    listId = (
      await send('post', `/boards/${boardId}/lists`, { title: 'To do' }).expect(
        201,
      )
    ).body.id;
    cardId = (
      await send('post', `/lists/${listId}/cards`, {
        title: 'Write spec',
      }).expect(201)
    ).body.id;
  });

  // Deleting the owner cascades to their boards and everything below.
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  const move = (id: string, body: unknown) =>
    send('post', `/checklist-items/${id}/move`, body);

  // The list read keeps working on archived parents (CHK-05).
  const read = async (): Promise<ItemBody[]> =>
    (await send('get', `/cards/${cardId}/checklist-items`).expect(200)).body;

  const textsInOrder = async (): Promise<string[]> => {
    const items = await read();
    items.forEach((item, i) => expect(item.position).toBe(i));
    return items.map(({ text }) => text);
  };

  it('moves the last item to the top and shifts the others down', async () => {
    const [, , third] = await createItems('1', '2', '3');

    const res = await move(third.id, { position: 0 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...third,
      position: 0,
      updatedAt: expect.any(String),
    });
    expect(await textsInOrder()).toEqual(['3', '1', '2']);
  });

  it('clamps a position past the end to the last index', async () => {
    const [first, , third] = await createItems('1', '2', '3');
    await move(third.id, { position: 0 }).expect(200);

    const res = await move(first.id, { position: 99 });

    expect(res.status).toBe(200);
    expect(res.body.position).toBe(2);
    expect(await textsInOrder()).toEqual(['3', '2', '1']);
  });

  it('gives the moved item a later updatedAt and keeps the shifted ones', async () => {
    const [first, second, third] = await createItems('1', '2', '3');

    const res = await move(third.id, { position: 0 }).expect(200);

    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(third.updatedAt).getTime(),
    );
    const items = await read();
    expect(items[1]).toEqual({ ...first, position: 1 });
    expect(items[2]).toEqual({ ...second, position: 2 });
  });

  it('returns the unchanged item for a same-place move', async () => {
    const [, second] = await createItems('1', '2', '3');

    const res = await move(second.id, { position: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(second);
  });

  it('keeps a single item at position 0, unchanged', async () => {
    const [only] = await createItems('1');

    const res = await move(only.id, { position: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(only);
  });

  it.each([
    ['missing', {}],
    ['negative', { position: -1 }],
    ['a fraction', { position: 1.5 }],
    ['a string', { position: '0' }],
    ['null', { position: null }],
  ])('returns 400 for a position that is %s', async (_case, body) => {
    const items = await createItems('1', '2');

    const res = await move(items[1].id, body);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'position', message: expect.any(String) },
      ]),
    );
    expect(await read()).toEqual(items);
  });

  it.each([
    ['cardId', { cardId: UNKNOWN_ID }],
    ['text', { text: 'Ship it' }],
  ])('returns 400 for the unknown property %s', async (_case, extra) => {
    const items = await createItems('1', '2');

    const res = await move(items[1].id, { position: 0, ...extra });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await read()).toEqual(items);
  });

  it("answers another user's, an unknown and a malformed item id with the same 404", async () => {
    const bobsBoard = await send('post', '/boards', { title: 'B' }, bobToken);
    const bobsList = await send(
      'post',
      `/boards/${bobsBoard.body.id}/lists`,
      { title: 'L' },
      bobToken,
    );
    const bobsCard = await send(
      'post',
      `/lists/${bobsList.body.id}/cards`,
      { title: 'C' },
      bobToken,
    );
    const bobsItems: ItemBody[] = [];
    for (const text of ['1', '2']) {
      const res = await send(
        'post',
        `/cards/${bobsCard.body.id}/checklist-items`,
        { text },
        bobToken,
      ).expect(201);
      bobsItems.push(res.body);
    }

    const responses = await Promise.all(
      [bobsItems[1].id, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
        move(id, { position: 0 }),
      ),
    );

    const bodies = responses.map((res) => {
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      const { instance: _instance, requestId: _requestId, ...rest } = res.body;
      return rest;
    });
    expect(bodies[0].type).toBe('/problems/checklist-item-not-found');
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    const bobsRead = await send(
      'get',
      `/cards/${bobsCard.body.id}/checklist-items`,
      undefined,
      bobToken,
    ).expect(200);
    expect(bobsRead.body).toEqual(bobsItems);
  });

  describe('under an archived parent', () => {
    let items: ItemBody[];

    beforeEach(async () => {
      items = await createItems('1', '2', '3');
    });

    const archive = (path: string) =>
      send('post', `${path}/archive`).expect(200);

    const expectProblem = async (res: request.Response, type: string) => {
      expect(res.status).toBe(409);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.type).toBe(type);
      expect(await read()).toEqual(items);
    };

    it('returns 409 card-archived for an archived card', async () => {
      await archive(`/cards/${cardId}`);

      await expectProblem(
        await move(items[2].id, { position: 0 }),
        '/problems/card-archived',
      );
    });

    it.each([
      ['active', false],
      ['archived', true],
    ])(
      'returns 409 list-archived for an archived list with the card %s',
      async (_case, cardArchived) => {
        if (cardArchived) {
          await archive(`/cards/${cardId}`);
        }
        await archive(`/lists/${listId}`);

        await expectProblem(
          await move(items[2].id, { position: 0 }),
          '/problems/list-archived',
        );
      },
    );

    it.each([
      ['active', false],
      ['archived', true],
    ])(
      'returns 409 board-archived for an archived board with the list and card %s',
      async (_case, childrenArchived) => {
        if (childrenArchived) {
          await archive(`/cards/${cardId}`);
          await archive(`/lists/${listId}`);
        }
        await archive(`/boards/${boardId}`);

        await expectProblem(
          await move(items[2].id, { position: 0 }),
          '/problems/board-archived',
        );
      },
    );
  });

  it('keeps contiguous positions under concurrent moves on one card', async () => {
    const items = await createItems('1', '2', '3', '4', '5');

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        move(items[i % 5].id, { position: (i * 3) % 7 }),
      ),
    );

    responses.forEach((res) => expect(res.status).toBe(200));
    const after = await read();
    expect(after.map(({ position }) => position)).toEqual([0, 1, 2, 3, 4]);
    expect(after.map(({ id }) => id).sort()).toEqual(
      items.map(({ id }) => id).sort(),
    );
  });

  it("leaves the card's updatedAt unchanged after moves", async () => {
    const [first, second] = await createItems('1', '2', '3');
    const before = await send('get', `/cards/${cardId}`).expect(200);

    await move(first.id, { position: 2 }).expect(200);
    await move(second.id, { position: 2 }).expect(200);

    const after = await send('get', `/cards/${cardId}`).expect(200);
    expect(after.body.updatedAt).toBe(before.body.updatedAt);
  });

  it('returns 401 without an access token', async () => {
    const items = await createItems('1', '2');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/checklist-items/${items[1].id}/move`)
      .send({ position: 0 });

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await read()).toEqual(items);
  });
});
