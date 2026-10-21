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

describe('PATCH /api/v1/checklist-items/:id (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let anaToken: string;
  let bobToken: string;
  let boardId: string;
  let listId: string;
  let cardId: string;
  let item: ItemBody;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  const send = (
    method: 'get' | 'post' | 'patch',
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

  const createItemIn = async (
    token: string,
    text = 'Write tests',
  ): Promise<ItemBody> => {
    const board = await send('post', '/boards', { title: 'Board' }, token);
    const list = await send(
      'post',
      `/boards/${board.body.id}/lists`,
      { title: 'To do' },
      token,
    );
    const card = await send(
      'post',
      `/lists/${list.body.id}/cards`,
      { title: 'Card' },
      token,
    );
    const created = await send(
      'post',
      `/cards/${card.body.id}/checklist-items`,
      { text },
      token,
    ).expect(201);
    return created.body;
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
    item = (
      await send('post', `/cards/${cardId}/checklist-items`, {
        text: 'Write tests',
      }).expect(201)
    ).body;
  });

  // Deleting the owner cascades to their boards and everything below.
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  const patch = (body: unknown, id = item.id) =>
    send('patch', `/checklist-items/${id}`, body);

  // The list read keeps working on archived parents (CHK-05).
  const read = async (): Promise<ItemBody | undefined> => {
    const res = await send('get', `/cards/${cardId}/checklist-items`).expect(
      200,
    );
    return (res.body as ItemBody[]).find(({ id }) => id === item.id);
  };

  const expectProblem = async (
    res: request.Response,
    status: number,
    type: string,
  ) => {
    expect(res.status).toBe(status);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe(type);
    expect(await read()).toEqual(item);
  };

  it('ticks the item with a later updatedAt', async () => {
    const res = await patch({ done: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...item,
      done: true,
      updatedAt: expect.any(String),
    });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(item.updatedAt).getTime(),
    );
    expect(await read()).toEqual(res.body);
  });

  it("counts the ticked item in the card's checklist", async () => {
    await patch({ done: true }).expect(200);

    const card = await send('get', `/cards/${cardId}`).expect(200);
    expect(card.body.checklist).toEqual({ total: 1, done: 1 });
  });

  it('renames the item with a trimmed text', async () => {
    const res = await patch({ text: '  Ship it  ' });

    expect(res.status).toBe(200);
    expect(res.body.text).toBe('Ship it');
    expect(res.body.done).toBe(false);
    expect(await read()).toEqual(res.body);
  });

  it('accepts a 200-character text after trim', async () => {
    const text = 'a'.repeat(200);

    const res = await patch({ text: `  ${text}  ` });

    expect(res.status).toBe(200);
    expect(res.body.text).toBe(text);
  });

  it('changes text and done at once', async () => {
    const res = await patch({ text: 'Ship it', done: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ text: 'Ship it', done: true });
  });

  it('unticks a ticked item', async () => {
    await patch({ done: true }).expect(200);

    const res = await patch({ done: false });

    expect(res.status).toBe(200);
    expect(res.body.done).toBe(false);
  });

  it.each([
    ['null', { text: null }],
    ['whitespace-only', { text: '   ' }],
    ['201 characters', { text: 'a'.repeat(201) }],
    ['201 characters after trim', { text: `  ${'a'.repeat(201)}  ` }],
    ['a number', { text: 42 }],
  ])('returns 400 for a text that is %s', async (_case, body) => {
    const res = await patch(body);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field: 'text', message: expect.any(String) }]),
    );
    expect(await read()).toEqual(item);
  });

  it.each([
    ['null', { done: null }],
    ['a string', { done: 'yes' }],
    ['a number', { done: 1 }],
  ])('returns 400 for a done that is %s', async (_case, body) => {
    const res = await patch(body);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field: 'done', message: expect.any(String) }]),
    );
    expect(await read()).toEqual(item);
  });

  it.each([
    ['position', { position: 3 }],
    ['cardId', { cardId: UNKNOWN_ID }],
  ])('returns 400 for the unknown property %s', async (_case, extra) => {
    const res = await patch({ done: true, ...extra });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await read()).toEqual(item);
  });

  it('returns the unchanged item for an empty body', async () => {
    const res = await patch({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual(item);
  });

  it("answers another user's, an unknown and a malformed item id with the same 404", async () => {
    const bobsItem = await createItemIn(bobToken);

    const responses = await Promise.all(
      [bobsItem.id, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
        patch({ done: true }, id),
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
      `/cards/${bobsItem.cardId}/checklist-items`,
      undefined,
      bobToken,
    ).expect(200);
    expect(bobsRead.body).toEqual([bobsItem]);
  });

  describe('under an archived parent', () => {
    const archive = (path: string) =>
      send('post', `${path}/archive`).expect(200);

    it('returns 409 card-archived for an archived card', async () => {
      await archive(`/cards/${cardId}`);

      await expectProblem(
        await patch({ done: true }),
        409,
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
          await patch({ done: true }),
          409,
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
          await patch({ done: true }),
          409,
          '/problems/board-archived',
        );
      },
    );

    it('returns 404 for an unknown item id on an archived board', async () => {
      await archive(`/boards/${boardId}`);

      const res = await patch({ done: true }, UNKNOWN_ID);

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/problems/checklist-item-not-found');
    });
  });

  it("leaves the card's updatedAt unchanged after the edits", async () => {
    const before = await send('get', `/cards/${cardId}`).expect(200);

    await patch({ text: 'Ship it' }).expect(200);
    await patch({ done: true }).expect(200);

    const after = await send('get', `/cards/${cardId}`).expect(200);
    expect(after.body.updatedAt).toBe(before.body.updatedAt);
  });

  it('returns 401 without an access token', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/checklist-items/${item.id}`)
      .send({ done: true });

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await read()).toEqual(item);
  });
});
