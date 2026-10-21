import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const NO_ITEMS = { total: 0, done: 0 };

describe('checklist in card responses (e2e)', () => {
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

  // The checklist endpoints come later, so items are inserted directly.
  const insertItems = async (cardId: string, done: boolean[]) => {
    for (const [position, isDone] of done.entries()) {
      await dataSource.query(
        `INSERT INTO "checklist_items" ("card_id", "text", "done", "position")
         VALUES ($1, $2, $3, $4)`,
        [cardId, `Item ${position}`, isDone, position],
      );
    }
  };

  const checklists = (cards: { id: string; checklist: object }[]) =>
    cards.map((card) => [card.id, card.checklist]);

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

  describe('for a card without items', () => {
    let cardId: string;

    beforeEach(async () => {
      cardId = await createCard('Write spec');
      await createCard('Design');
    });

    it('POST /lists/:listId/cards returns checklist { total: 0, done: 0 }', async () => {
      const res = await send('post', `/lists/${listId}/cards`, {
        title: 'Review',
      });

      expect(res.status).toBe(201);
      expect(res.body.checklist).toEqual(NO_ITEMS);
    });

    it('GET /cards/:id returns checklist { total: 0, done: 0 }', async () => {
      const res = await send('get', `/cards/${cardId}`);

      expect(res.status).toBe(200);
      expect(res.body.checklist).toEqual(NO_ITEMS);
    });

    it('GET /lists/:listId/cards returns checklist { total: 0, done: 0 } for each card', async () => {
      const res = await send('get', `/lists/${listId}/cards`);

      expect(res.status).toBe(200);
      expect(
        res.body.map((card: { checklist: object }) => card.checklist),
      ).toEqual([NO_ITEMS, NO_ITEMS]);
    });

    it('GET /boards/:boardId/cards returns checklist { total: 0, done: 0 } for each card', async () => {
      const res = await send('get', `/boards/${boardId}/cards`);

      expect(res.status).toBe(200);
      expect(
        res.body.map((card: { checklist: object }) => card.checklist),
      ).toEqual([NO_ITEMS, NO_ITEMS]);
    });

    it('PATCH /cards/:id returns checklist { total: 0, done: 0 }', async () => {
      const res = await send('patch', `/cards/${cardId}`, { done: true });

      expect(res.status).toBe(200);
      expect(res.body.checklist).toEqual(NO_ITEMS);
    });

    it('POST /cards/:id/move returns checklist { total: 0, done: 0 }', async () => {
      const res = await send('post', `/cards/${cardId}/move`, { position: 1 });

      expect(res.status).toBe(200);
      expect(res.body.checklist).toEqual(NO_ITEMS);
    });

    it('POST /cards/:id/archive returns checklist { total: 0, done: 0 }', async () => {
      const res = await send('post', `/cards/${cardId}/archive`);

      expect(res.status).toBe(200);
      expect(res.body.checklist).toEqual(NO_ITEMS);
    });

    it('POST /cards/:id/unarchive returns checklist { total: 0, done: 0 }', async () => {
      await send('post', `/cards/${cardId}/archive`).expect(200);

      const res = await send('post', `/cards/${cardId}/unarchive`);

      expect(res.status).toBe(200);
      expect(res.body.checklist).toEqual(NO_ITEMS);
    });
  });

  describe('for a card with items', () => {
    let cardId: string;
    let otherId: string;

    beforeEach(async () => {
      cardId = await createCard('Write spec');
      otherId = await createCard('Design');
      await insertItems(cardId, [true, false, false]);
    });

    it('GET /cards/:id, /lists/:listId/cards and /boards/:boardId/cards count total and done items per card', async () => {
      const one = await send('get', `/cards/${cardId}`);
      const inList = await send('get', `/lists/${listId}/cards`);
      const inBoard = await send('get', `/boards/${boardId}/cards`);

      expect(one.status).toBe(200);
      expect(one.body.checklist).toEqual({ total: 3, done: 1 });
      expect(inList.status).toBe(200);
      expect(checklists(inList.body)).toEqual([
        [cardId, { total: 3, done: 1 }],
        [otherId, NO_ITEMS],
      ]);
      expect(inBoard.status).toBe(200);
      expect(checklists(inBoard.body)).toEqual([
        [cardId, { total: 3, done: 1 }],
        [otherId, NO_ITEMS],
      ]);
    });

    it('PATCH, move, archive and unarchive return the counts of the card', async () => {
      const updated = await send('patch', `/cards/${cardId}`, { done: true });
      const moved = await send('post', `/cards/${cardId}/move`, {
        position: 1,
      });
      const archived = await send('post', `/cards/${cardId}/archive`);
      const unarchived = await send('post', `/cards/${cardId}/unarchive`);

      for (const res of [updated, moved, archived, unarchived]) {
        expect(res.status).toBe(200);
      }
      expect(
        [updated, moved, archived, unarchived].map((res) => res.body.checklist),
      ).toEqual([
        { total: 3, done: 1 },
        { total: 3, done: 1 },
        { total: 3, done: 1 },
        { total: 3, done: 1 },
      ]);
    });

    it('GET /lists/:listId/cards?archived=true counts the items of an archived card', async () => {
      await send('post', `/cards/${cardId}/archive`).expect(200);

      const res = await send('get', `/lists/${listId}/cards?archived=true`);

      expect(res.status).toBe(200);
      expect(checklists(res.body)).toEqual([[cardId, { total: 3, done: 1 }]]);
    });
  });
});
