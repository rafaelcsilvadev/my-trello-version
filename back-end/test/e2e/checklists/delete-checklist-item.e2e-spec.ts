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

describe('DELETE /api/v1/checklist-items/:id (e2e)', () => {
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
    method: 'get' | 'post' | 'patch' | 'delete',
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

  const remove = (id: string) => send('delete', `/checklist-items/${id}`);

  // The list read keeps working on archived parents (CHK-05).
  const read = async (): Promise<ItemBody[]> =>
    (await send('get', `/cards/${cardId}/checklist-items`).expect(200)).body;

  it('deletes an item with 204 and closes the gap', async () => {
    const [first, second, third] = await createItems('1', '2', '3');

    const res = await remove(second.id);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(await read()).toEqual([first, { ...third, position: 1 }]);
  });

  it('answers 404 when the same item is deleted again', async () => {
    const [, second] = await createItems('1', '2', '3');
    await remove(second.id).expect(204);

    const res = await remove(second.id);

    expect(res.status).toBe(404);
    expect(res.body.type).toBe('/problems/checklist-item-not-found');
  });

  it('deletes the last item and keeps the others unchanged', async () => {
    const [first, second, third] = await createItems('1', '2', '3');

    await remove(third.id).expect(204);

    expect(await read()).toEqual([first, second]);
  });

  it("drops the card's checklist total and keeps its updatedAt", async () => {
    const [first, second] = await createItems('1', '2');
    await send('patch', `/checklist-items/${first.id}`, { done: true }).expect(
      200,
    );
    const before = await send('get', `/cards/${cardId}`).expect(200);

    await remove(second.id).expect(204);

    const after = await send('get', `/cards/${cardId}`).expect(200);
    expect(before.body.checklist.total).toBe(2);
    expect(after.body.checklist.total).toBe(1);
    expect(after.body.updatedAt).toBe(before.body.updatedAt);
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
    const bobsItem = await send(
      'post',
      `/cards/${bobsCard.body.id}/checklist-items`,
      { text: '1' },
      bobToken,
    ).expect(201);

    const responses = await Promise.all(
      [bobsItem.body.id, UNKNOWN_ID, 'not-a-uuid'].map(remove),
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
    expect(bobsRead.body).toEqual([bobsItem.body]);
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

      await expectProblem(await remove(items[1].id), '/problems/card-archived');
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
          await remove(items[1].id),
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
          await remove(items[1].id),
          '/problems/board-archived',
        );
      },
    );

    // CHK-25 through the API: the items go with their card.
    it('deletes the items of an archived card when the card is deleted', async () => {
      await archive(`/cards/${cardId}`);

      await send('delete', `/cards/${cardId}`).expect(204);

      const res = await remove(items[0].id);
      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/problems/checklist-item-not-found');
      const [{ count }] = await dataSource.query(
        'SELECT count(*)::int AS count FROM "checklist_items" WHERE "card_id" = $1',
        [cardId],
      );
      expect(count).toBe(0);
    });
  });

  it('keeps contiguous positions under concurrent deletes on one card', async () => {
    const items = await createItems('1', '2', '3', '4', '5', '6');

    const responses = await Promise.all(
      [items[0], items[2], items[4]].map(({ id }) => remove(id)),
    );

    responses.forEach((res) => expect(res.status).toBe(204));
    const after = await read();
    expect(after.map(({ text, position }) => [text, position])).toEqual([
      ['2', 0],
      ['4', 1],
      ['6', 2],
    ]);
  });

  it('returns 401 without an access token', async () => {
    const items = await createItems('1', '2');

    const res = await request(app.getHttpServer()).delete(
      `/api/v1/checklist-items/${items[1].id}`,
    );

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await read()).toEqual(items);
  });
});
