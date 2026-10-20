import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type CardBody = {
  id: string;
  listId: string;
  labelIds: string[];
  archivedAt: string | null;
  updatedAt: string;
};

type Method = 'put' | 'delete';

describe('PUT and DELETE /api/v1/cards/:id/labels/:labelId (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let anaToken: string;
  let bobToken: string;
  let boardId: string;
  let listId: string;
  let cardId: string;
  let bugId: string;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  const send = (
    method: 'get' | 'post' | Method,
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

  const createBoard = async (token = anaToken): Promise<string> =>
    (await send('post', '/boards', { title: 'Roadmap' }, token).expect(201))
      .body.id;

  const createList = async (board = boardId, token = anaToken) =>
    (
      await send(
        'post',
        `/boards/${board}/lists`,
        { title: 'To do' },
        token,
      ).expect(201)
    ).body.id as string;

  const createCard = async (list = listId, token = anaToken) =>
    (
      await send(
        'post',
        `/lists/${list}/cards`,
        { title: 'Spec' },
        token,
      ).expect(201)
    ).body.id as string;

  const createLabel = async (
    name: string,
    board = boardId,
    token = anaToken,
  ): Promise<string> =>
    (
      await send(
        'post',
        `/boards/${board}/labels`,
        { name, color: 'red' },
        token,
      ).expect(201)
    ).body.id;

  const label = (
    method: Method,
    card: string,
    labelId: string,
    token = anaToken,
  ) => send(method, `/cards/${card}/labels/${labelId}`, undefined, token);

  const read = async (id = cardId): Promise<CardBody> =>
    (await send('get', `/cards/${id}`).expect(200)).body;

  const toggleArchive = async (path: string, archived: boolean) => {
    await send('post', `${path}/${archived ? 'archive' : 'unarchive'}`).expect(
      200,
    );
  };

  beforeEach(async () => {
    anaToken = await register('Ana', 'ana@example.com');
    bobToken = await register('Bob', 'bob@example.com');
    boardId = await createBoard();
    listId = await createList();
    cardId = await createCard();
    bugId = await createLabel('Bug');
  });

  // Deleting the owner cascades to their boards, lists, cards and labels.
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  it('PUT applies the label with 204 and no body, leaving updatedAt unchanged', async () => {
    const before = await read();

    const res = await label('put', cardId, bugId);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(await read()).toEqual({ ...before, labelIds: [bugId] });
  });

  it('PUT of an applied label returns 204 and keeps it once', async () => {
    await label('put', cardId, bugId).expect(204);

    const res = await label('put', cardId, bugId);

    expect(res.status).toBe(204);
    expect((await read()).labelIds).toEqual([bugId]);
  });

  it('DELETE removes the label with 204 and no body, leaving updatedAt unchanged', async () => {
    await label('put', cardId, bugId).expect(204);
    const before = await read();

    const res = await label('delete', cardId, bugId);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(await read()).toEqual({ ...before, labelIds: [] });
  });

  it('DELETE of a label not applied returns 204 with no change', async () => {
    const before = await read();

    const res = await label('delete', cardId, bugId);

    expect(res.status).toBe(204);
    expect(await read()).toEqual(before);
  });

  it('returns labelIds in label creation order on every card read', async () => {
    const ideaId = await createLabel('Idea');
    await label('put', cardId, ideaId).expect(204);
    await label('put', cardId, bugId).expect(204);

    const one = await send('get', `/cards/${cardId}`);
    const inList = await send('get', `/lists/${listId}/cards`);
    const inBoard = await send('get', `/boards/${boardId}/cards`);

    expect(one.body.labelIds).toEqual([bugId, ideaId]);
    expect(inList.body[0].labelIds).toEqual([bugId, ideaId]);
    expect(inBoard.body[0].labelIds).toEqual([bugId, ideaId]);
  });

  describe.each<Method>(['put', 'delete'])('%s', (method) => {
    it('returns identical 404 label-not-found for an unknown, foreign, other-board or malformed label id', async () => {
      const bobLabel = await createLabel(
        'Bug',
        await createBoard(bobToken),
        bobToken,
      );
      const otherBoardLabel = await createLabel('Bug', await createBoard());
      const before = await read();

      const responses = [];
      for (const labelId of [
        UNKNOWN_ID,
        bobLabel,
        otherBoardLabel,
        'not-a-uuid',
      ]) {
        responses.push(await label(method, cardId, labelId));
      }

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
      expect(bodies[0].type).toBe('/problems/label-not-found');
      for (const body of bodies) {
        expect(body).toEqual(bodies[0]);
      }
      expect(await read()).toEqual(before);
    });

    it('returns identical 404 card-not-found for an unknown, foreign or malformed card id', async () => {
      const bobCard = await createCard(
        await createList(await createBoard(bobToken), bobToken),
        bobToken,
      );

      const responses = [];
      for (const id of [UNKNOWN_ID, bobCard, 'not-a-uuid']) {
        responses.push(await label(method, id, bugId));
      }

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
      for (const body of bodies) {
        expect(body).toEqual(bodies[0]);
      }
    });

    it("returns 404 card-not-found for the caller's own label on another user's card", async () => {
      const bobLabel = await createLabel(
        'Bug',
        await createBoard(bobToken),
        bobToken,
      );

      const res = await label(method, cardId, bobLabel, bobToken);

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/problems/card-not-found');
      expect((await read()).labelIds).toEqual([]);
    });

    it('returns 404 card-not-found when both the card and the label fail their lookup', async () => {
      const res = await label(method, UNKNOWN_ID, 'not-a-uuid');

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/problems/card-not-found');
    });

    it('returns 409 card-archived on an archived card and keeps its labels', async () => {
      await label('put', cardId, bugId).expect(204);
      await toggleArchive(`/cards/${cardId}`, true);
      const ideaId = await createLabel('Idea');

      const res = await label(
        method,
        cardId,
        method === 'put' ? ideaId : bugId,
      );

      expect(res.status).toBe(409);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.type).toBe('/problems/card-archived');
      await toggleArchive(`/cards/${cardId}`, false);
      expect((await read()).labelIds).toEqual([bugId]);
    });

    it('returns 409 list-archived on an archived list, with the card active or archived', async () => {
      const archivedCard = await createCard();
      await label('put', cardId, bugId).expect(204);
      await label('put', archivedCard, bugId).expect(204);
      await toggleArchive(`/cards/${archivedCard}`, true);
      await toggleArchive(`/lists/${listId}`, true);

      const responses = [
        await label(method, cardId, bugId),
        await label(method, archivedCard, bugId),
      ];

      for (const res of responses) {
        expect(res.status).toBe(409);
        expect(res.body.type).toBe('/problems/list-archived');
      }
      await toggleArchive(`/lists/${listId}`, false);
      expect((await read(cardId)).labelIds).toEqual([bugId]);
      expect((await read(archivedCard)).labelIds).toEqual([bugId]);
    });

    it('returns 409 board-archived on an archived board, with the list and card active or archived', async () => {
      const archivedList = await createList();
      const archivedCard = await createCard(archivedList);
      await label('put', cardId, bugId).expect(204);
      await label('put', archivedCard, bugId).expect(204);
      await toggleArchive(`/cards/${archivedCard}`, true);
      await toggleArchive(`/lists/${archivedList}`, true);
      await toggleArchive(`/boards/${boardId}`, true);

      const responses = [
        await label(method, cardId, bugId),
        await label(method, archivedCard, bugId),
      ];

      for (const res of responses) {
        expect(res.status).toBe(409);
        expect(res.body.type).toBe('/problems/board-archived');
      }
      await toggleArchive(`/boards/${boardId}`, false);
      expect((await read(cardId)).labelIds).toEqual([bugId]);
      expect((await read(archivedCard)).labelIds).toEqual([bugId]);
    });

    it('returns 404 label-not-found before 409 for a bad label on an archived board', async () => {
      await toggleArchive(`/boards/${boardId}`, true);

      const res = await label(method, cardId, UNKNOWN_ID);

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/problems/label-not-found');
    });

    it('returns 401 without a token', async () => {
      const res = await request(app.getHttpServer())[method](
        `/api/v1/cards/${cardId}/labels/${bugId}`,
      );

      expect(res.status).toBe(401);
    });
  });

  it('deleting a label removes it from active and archived cards without touching updatedAt', async () => {
    const archivedCard = await createCard();
    await label('put', cardId, bugId).expect(204);
    await label('put', archivedCard, bugId).expect(204);
    await toggleArchive(`/cards/${archivedCard}`, true);
    const before = [await read(cardId), await read(archivedCard)];

    await send('delete', `/labels/${bugId}`).expect(204);

    expect([await read(cardId), await read(archivedCard)]).toEqual(
      before.map((card) => ({ ...card, labelIds: [] })),
    );
  });

  it('10 concurrent PUT of one label all return 204 and apply it once', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => label('put', cardId, bugId)),
    );

    expect(responses.map((res) => res.status)).toEqual(Array(10).fill(204));
    expect((await read()).labelIds).toEqual([bugId]);
  });
});
