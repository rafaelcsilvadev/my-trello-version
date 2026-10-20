import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { CardsRepository } from '../../../src/cards/cards.repository';
import { createTestApp } from '../../support/create-test-app';

describe('labelIds in card responses (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let boardId: string;
  let listId: string;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  const send = (
    method: 'get' | 'post' | 'patch',
    path: string,
    body?: object,
  ) =>
    request(app.getHttpServer())
      [method](`/api/v1${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const createCard = async (title: string): Promise<string> => {
    const res = await send('post', `/lists/${listId}/cards`, { title }).expect(
      201,
    );
    return res.body.id;
  };

  const createLabel = async (name: string, color: string): Promise<string> => {
    const res = await send('post', `/boards/${boardId}/labels`, {
      name,
      color,
    }).expect(201);
    return res.body.id;
  };

  beforeEach(async () => {
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'correct horse',
      })
      .expect(201);
    token = registered.body.accessToken;
    boardId = (await send('post', '/boards', { title: 'Roadmap' }).expect(201))
      .body.id;
    listId = (
      await send('post', `/boards/${boardId}/lists`, { title: 'To do' }).expect(
        201,
      )
    ).body.id;
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns labelIds [] from every card route for a card without labels', async () => {
    const created = await send('post', `/lists/${listId}/cards`, {
      title: 'Write spec',
    });
    const id = created.body.id;
    await createCard('Design');

    const one = await send('get', `/cards/${id}`);
    const inList = await send('get', `/lists/${listId}/cards`);
    const inBoard = await send('get', `/boards/${boardId}/cards`);
    const updated = await send('patch', `/cards/${id}`, { done: true });
    const moved = await send('post', `/cards/${id}/move`, { position: 1 });
    const archived = await send('post', `/cards/${id}/archive`);
    const unarchived = await send('post', `/cards/${id}/unarchive`);

    expect(created.status).toBe(201);
    for (const res of [one, updated, moved, archived, unarchived]) {
      expect(res.status).toBe(200);
    }
    expect(
      [created, one, updated, moved, archived, unarchived].map(
        (res) => res.body.labelIds,
      ),
    ).toEqual([[], [], [], [], [], []]);
    expect(inList.status).toBe(200);
    expect(
      inList.body.map((card: { labelIds: string[] }) => card.labelIds),
    ).toEqual([[], []]);
    expect(inBoard.status).toBe(200);
    expect(
      inBoard.body.map((card: { labelIds: string[] }) => card.labelIds),
    ).toEqual([[], []]);
  });

  describe('with labels linked through the repository', () => {
    let cardId: string;
    let bugId: string;
    let ideaId: string;

    // Linked in reverse creation order: the response follows label creation
    // order, not link order.
    beforeEach(async () => {
      cardId = await createCard('Write spec');
      bugId = await createLabel('Bug', 'red');
      ideaId = await createLabel('Idea', 'yellow');
      const cards = app.get(CardsRepository);
      await cards.linkLabel(cardId, ideaId);
      await cards.linkLabel(cardId, bugId);
    });

    it('GET /cards/:id returns labelIds in label creation order', async () => {
      const res = await send('get', `/cards/${cardId}`);

      expect(res.status).toBe(200);
      expect(res.body.labelIds).toEqual([bugId, ideaId]);
    });

    it('GET /lists/:listId/cards returns labelIds in label creation order', async () => {
      const other = await createCard('Design');

      const res = await send('get', `/lists/${listId}/cards`);

      expect(res.status).toBe(200);
      expect(
        res.body.map((card: { id: string; labelIds: string[] }) => [
          card.id,
          card.labelIds,
        ]),
      ).toEqual([
        [cardId, [bugId, ideaId]],
        [other, []],
      ]);
    });

    it('GET /boards/:boardId/cards returns labelIds in label creation order', async () => {
      const other = await createCard('Design');

      const res = await send('get', `/boards/${boardId}/cards`);

      expect(res.status).toBe(200);
      expect(
        res.body.map((card: { id: string; labelIds: string[] }) => [
          card.id,
          card.labelIds,
        ]),
      ).toEqual([
        [cardId, [bugId, ideaId]],
        [other, []],
      ]);
    });
  });
});
