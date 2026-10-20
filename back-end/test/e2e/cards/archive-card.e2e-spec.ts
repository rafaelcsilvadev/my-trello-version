import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
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

describe('POST /api/v1/cards/:id/archive and /unarchive (e2e)', () => {
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

  const createCards = async (...titles: string[]): Promise<CardBody[]> => {
    const cards: CardBody[] = [];
    for (const title of titles) {
      cards.push(await createCard(title));
    }
    return cards;
  };

  const archiveParent = async (path: string) => {
    await request(app.getHttpServer())
      .post(`/api/v1/${path}/archive`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
  };

  const action = (
    id: string,
    name: 'archive' | 'unarchive',
    token = anaToken,
  ) =>
    request(app.getHttpServer())
      .post(`/api/v1/cards/${id}/${name}`)
      .set('Authorization', `Bearer ${token}`);

  const read = async (id: string, token = anaToken): Promise<CardBody> => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/cards/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  const cardsOf = async (query = ''): Promise<CardBody[]> => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/lists/${listId}/cards${query}`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
    return res.body;
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

  it('archives a card, closes the gap and lists it as archived', async () => {
    const [one] = await createCards('1', '2', '3');
    const start = Date.now();

    const res = await action(one.id, 'archive');

    const end = Date.now();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...one,
      position: null,
      archivedAt: expect.stringMatching(ISO_DATE),
      updatedAt: expect.any(String),
    });
    const archivedAt = new Date(res.body.archivedAt).getTime();
    expect(archivedAt).toBeGreaterThanOrEqual(start);
    expect(archivedAt).toBeLessThanOrEqual(end);
    expect(
      (await cardsOf()).map((card) => [card.title, card.position]),
    ).toEqual([
      ['2', 0],
      ['3', 1],
    ]);
    expect(await cardsOf('?archived=true')).toEqual([res.body]);
  });

  it('returns 200 with the original archivedAt when archiving again', async () => {
    const [one] = await createCards('1', '2');
    const archived = (await action(one.id, 'archive').expect(200)).body;

    const res = await action(one.id, 'archive');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(archived);
    expect(await read(one.id)).toEqual(archived);
  });

  it('unarchives a card to the end of the active cards', async () => {
    const [one] = await createCards('1', '2', '3');
    const archived = (await action(one.id, 'archive').expect(200)).body;

    const res = await action(one.id, 'unarchive');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...archived,
      position: 2,
      archivedAt: null,
      updatedAt: expect.any(String),
    });
    expect(
      (await cardsOf()).map((card) => [card.title, card.position]),
    ).toEqual([
      ['2', 0],
      ['3', 1],
      ['1', 2],
    ]);
    expect(await cardsOf('?archived=true')).toEqual([]);
  });

  it('returns 200 with the identical card when unarchiving an active card', async () => {
    const [, two] = await createCards('1', '2');

    const res = await action(two.id, 'unarchive');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(two);
    expect(await read(two.id)).toEqual(two);
  });

  // Every card state, including the ones where the card-state branch would
  // otherwise no-op with 200 (CRD-35, CRD-36).
  it.each([
    ['archive' as const, 'an active', 'lists', '/problems/list-archived'],
    ['archive' as const, 'an archived', 'lists', '/problems/list-archived'],
    ['unarchive' as const, 'an active', 'lists', '/problems/list-archived'],
    ['unarchive' as const, 'an archived', 'lists', '/problems/list-archived'],
    ['archive' as const, 'an active', 'boards', '/problems/board-archived'],
    ['archive' as const, 'an archived', 'boards', '/problems/board-archived'],
    ['unarchive' as const, 'an active', 'boards', '/problems/board-archived'],
    ['unarchive' as const, 'an archived', 'boards', '/problems/board-archived'],
  ])(
    'returns 409 on %s of %s card of archived %s and keeps it',
    async (name, state, parent, type) => {
      const [one] = await createCards('1', '2');
      if (state === 'an archived') {
        await action(one.id, 'archive').expect(200);
      }
      const before = await read(one.id);
      await archiveParent(`${parent}/${parent === 'lists' ? listId : boardId}`);

      const res = await action(one.id, name);

      expect(res.status).toBe(409);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.type).toBe(type);
      expect(await read(one.id)).toEqual(before);
    },
  );

  it.each([['archive' as const], ['unarchive' as const]])(
    "answers %s of another user's, an unknown and a malformed id with the same 404",
    async (name) => {
      const bobsBoardId = await createBoard(bobToken, 'Bob board');
      const bobsListId = await createList('Bob A', bobsBoardId, bobToken);
      const bobsCard = await createCard('Bob 1', bobsListId, bobToken);

      const responses = await Promise.all(
        [bobsCard.id, UNKNOWN_ID, 'not-a-uuid'].map((id) => action(id, name)),
      );

      const bodies = responses.map((res) => {
        expect(res.status).toBe(404);
        expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
        const {
          instance: _instance,
          requestId: _requestId,
          ...rest
        } = res.body;
        return rest;
      });
      expect(bodies[0].type).toBe('/problems/card-not-found');
      expect(bodies[1]).toEqual(bodies[0]);
      expect(bodies[2]).toEqual(bodies[0]);
      expect(await read(bobsCard.id, bobToken)).toEqual(bobsCard);
    },
  );

  it.each([['archive'], ['unarchive']])(
    'returns 401 on %s without an access token',
    async (name) => {
      const [one] = await createCards('1');

      const res = await request(app.getHttpServer()).post(
        `/api/v1/cards/${one.id}/${name}`,
      );

      expect(res.status).toBe(401);
      expect(await read(one.id)).toEqual(one);
    },
  );
});
