import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('POST /api/v1/cards/:cardId/checklist-items (e2e)', () => {
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
    body?: object,
    token = anaToken,
  ) =>
    request(app.getHttpServer())
      [method](`/api/v1${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const register = async (name: string, email: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name, email, password: 'correct horse' })
      .expect(201);
    return res.body.accessToken;
  };

  const createCardIn = async (token: string): Promise<string> => {
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
    ).expect(201);
    return card.body.id;
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

  const createItem = (body: Record<string, unknown>, id = cardId) =>
    send('post', `/cards/${id}/checklist-items`, body);

  const countItems = async (): Promise<number> => {
    const [{ count }] = await dataSource.query(
      'SELECT count(*)::int AS count FROM "checklist_items"',
    );
    return count;
  };

  const expectProblem = async (
    res: request.Response,
    status: number,
    type: string,
  ) => {
    expect(res.status).toBe(status);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe(type);
    expect(await countItems()).toBe(0);
  };

  it('returns 201 with only the public item fields', async () => {
    const res = await createItem({ text: 'Write tests' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(UUID),
      cardId,
      text: 'Write tests',
      done: false,
      position: 0,
      createdAt: expect.stringMatching(ISO_DATE),
      updatedAt: expect.stringMatching(ISO_DATE),
    });
  });

  it('stores the item with a trimmed text', async () => {
    const res = await createItem({ text: '  Write tests  ' });

    expect(res.status).toBe(201);
    expect(res.body.text).toBe('Write tests');
    const [row] = await dataSource.query(
      'SELECT "card_id", "text" FROM "checklist_items" WHERE "id" = $1',
      [res.body.id],
    );
    expect(row).toEqual({ card_id: cardId, text: 'Write tests' });
  });

  it('places the second item at position 1', async () => {
    await createItem({ text: 'First' }).expect(201);

    const res = await createItem({ text: 'Second' });

    expect(res.status).toBe(201);
    expect(res.body.position).toBe(1);
  });

  it.each([
    ['missing', {}],
    ['a number', { text: 42 }],
    ['null', { text: null }],
    ['whitespace-only', { text: '   ' }],
    ['201 characters', { text: 'a'.repeat(201) }],
  ])('returns 400 for a text that is %s', async (_case, body) => {
    const res = await createItem(body);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field: 'text', message: expect.any(String) }]),
    );
    expect(await countItems()).toBe(0);
  });

  it('accepts a 200-character text', async () => {
    const text = 'a'.repeat(200);

    const res = await createItem({ text });

    expect(res.status).toBe(201);
    expect(res.body.text).toBe(text);
  });

  it.each([
    ['done', { done: true }],
    ['position', { position: 3 }],
    ['cardId', { cardId: '00000000-0000-4000-8000-000000000000' }],
  ])('returns 400 for the unknown property %s', async (_case, extra) => {
    const res = await createItem({ text: 'Write tests', ...extra });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await countItems()).toBe(0);
  });

  it('returns 401 without an access token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/cards/${cardId}/checklist-items`)
      .send({ text: 'Write tests' });

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await countItems()).toBe(0);
  });

  it("answers another user's, an unknown and a malformed card id with the same 404", async () => {
    const bobsCardId = await createCardIn(bobToken);

    const responses = await Promise.all(
      [bobsCardId, '00000000-0000-4000-8000-000000000000', 'not-a-uuid'].map(
        (id) => createItem({ text: 'Write tests' }, id),
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
    expect(await countItems()).toBe(0);
  });

  describe('under an archived parent', () => {
    const archive = (path: string) =>
      send('post', `${path}/archive`).expect(200);

    it('returns 409 card-archived for an archived card', async () => {
      await archive(`/cards/${cardId}`);

      await expectProblem(
        await createItem({ text: 'Write tests' }),
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
          await createItem({ text: 'Write tests' }),
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
          await createItem({ text: 'Write tests' }),
          409,
          '/problems/board-archived',
        );
      },
    );
  });

  it("counts the items in the card's checklist without touching the card", async () => {
    const before = await send('get', `/cards/${cardId}`).expect(200);

    for (const text of ['One', 'Two', 'Three']) {
      await createItem({ text }).expect(201);
    }

    const after = await send('get', `/cards/${cardId}`).expect(200);
    expect(after.body.checklist).toEqual({ total: 3, done: 0 });
    expect(after.body.updatedAt).toBe(before.body.updatedAt);
  });

  it('gives ten concurrent creates on one card the positions 0..9', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) => createItem({ text: `Item ${i}` })),
    );

    expect(responses.map((res) => res.status)).toEqual(Array(10).fill(201));
    const positions = responses
      .map((res) => res.body.position)
      .sort((a, b) => a - b);
    expect(positions).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
