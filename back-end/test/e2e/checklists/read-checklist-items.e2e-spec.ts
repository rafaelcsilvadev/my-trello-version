import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;

describe('GET /api/v1/cards/:cardId/checklist-items (e2e)', () => {
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

  const createCard = async (title: string, token = anaToken) => {
    const res = await send(
      'post',
      `/lists/${listId}/cards`,
      { title },
      token,
    ).expect(201);
    return res.body.id as string;
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
    cardId = await createCard('Write spec');
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  const listItems = (id = cardId, token = anaToken) =>
    send('get', `/cards/${id}/checklist-items`, undefined, token);

  const createItems = async (texts: string[]) => {
    for (const text of texts) {
      await send('post', `/cards/${cardId}/checklist-items`, { text }).expect(
        201,
      );
    }
  };

  it('returns [] for a card without items', async () => {
    const res = await listItems();

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns the items at positions 0..2 in creation order', async () => {
    await createItems(['One', 'Two', 'Three']);

    const res = await listItems();

    expect(res.status).toBe(200);
    expect(
      res.body.map((item: { text: string; position: number }) => [
        item.text,
        item.position,
      ]),
    ).toEqual([
      ['One', 0],
      ['Two', 1],
      ['Three', 2],
    ]);
  });

  it('only returns the items of the requested card', async () => {
    await createItems(['One']);
    const otherCardId = await createCard('Other');

    const res = await listItems(otherCardId);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns the same items after the card, the list and the board are archived', async () => {
    await createItems(['One', 'Two', 'Three']);
    const before = await listItems().expect(200);

    await send('post', `/cards/${cardId}/archive`).expect(200);
    await send('post', `/lists/${listId}/archive`).expect(200);
    await send('post', `/boards/${boardId}/archive`).expect(200);

    const res = await listItems();
    expect(res.status).toBe(200);
    expect(res.body).toEqual(before.body);
  });

  it('returns 401 without an access token', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/cards/${cardId}/checklist-items`,
    );

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
  });

  it("answers another user's, an unknown and a malformed card id with the same 404", async () => {
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
    ).expect(201);

    const responses = await Promise.all(
      [
        bobsCard.body.id,
        '00000000-0000-4000-8000-000000000000',
        'not-a-uuid',
      ].map((id) => listItems(id)),
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
  });

  it('answers an unknown card id with the same 404 body on POST and GET', async () => {
    const id = '00000000-0000-4000-8000-000000000000';

    const responses = await Promise.all([
      listItems(id),
      send('post', `/cards/${id}/checklist-items`, { text: 'Write tests' }),
    ]);

    const [read, created] = responses.map((res) => {
      expect(res.status).toBe(404);
      const { instance: _instance, requestId: _requestId, ...rest } = res.body;
      return rest;
    });
    expect(created).toEqual(read);
  });
});
