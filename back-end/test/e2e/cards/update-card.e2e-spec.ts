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

describe('PATCH /api/v1/cards/:id (e2e)', () => {
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
    body: object = { title: 'Write spec' },
    id = listId,
    token = anaToken,
  ): Promise<CardBody> => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/lists/${id}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);
    return res.body;
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

  const patch = (id: string, body: unknown, token = anaToken) =>
    request(app.getHttpServer())
      .patch(`/api/v1/cards/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);

  const read = async (id: string, token = anaToken): Promise<CardBody> => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/cards/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  const expectConflict = (res: request.Response, type: string) => {
    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe(type);
  };

  beforeEach(async () => {
    anaToken = await register('Ana', 'ana@example.com');
    bobToken = await register('Bob', 'bob@example.com');
    boardId = await createBoard(anaToken, 'Roadmap');
    listId = await createList('To do');
  });

  // Deleting the owner cascades to their boards, lists and cards (CRD-40).
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets done and dueDate with a later updatedAt, then clears dueDate only', async () => {
    const created = await createCard();

    const first = await patch(created.id, {
      done: true,
      dueDate: '2026-12-24',
    });

    expect(first.status).toBe(200);
    expect(first.body).toEqual({
      ...created,
      done: true,
      dueDate: '2026-12-24',
      updatedAt: expect.any(String),
    });
    expect(new Date(first.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.updatedAt).getTime(),
    );

    const second = await patch(created.id, { dueDate: null });

    expect(second.status).toBe(200);
    expect(second.body.dueDate).toBeNull();
    expect(second.body.done).toBe(true);
    expect(await read(created.id)).toEqual(second.body);
  });

  it('updates title and description with trimming and leaves the rest', async () => {
    const created = await createCard({
      title: 'Write spec',
      dueDate: '2026-11-01',
    });

    const res = await patch(created.id, {
      title: '  Write design  ',
      description: '  Cover the edge cases  ',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...created,
      title: 'Write design',
      description: 'Cover the edge cases',
      updatedAt: expect.any(String),
    });
    expect(await read(created.id)).toEqual(res.body);
  });

  it('stores a blank description as null', async () => {
    const created = await createCard({
      title: 'Write spec',
      description: 'Draft',
    });

    const res = await patch(created.id, { description: '  ' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBeNull();
    expect(await read(created.id)).toEqual(res.body);
  });

  it('marks a card without a due date as done', async () => {
    const created = await createCard();

    const res = await patch(created.id, { done: true });

    expect(res.status).toBe(200);
    expect(res.body.done).toBe(true);
    expect(res.body.dueDate).toBeNull();
  });

  it('returns 200 with the identical card for an empty body', async () => {
    const created = await createCard();

    const res = await patch(created.id, {});

    expect(res.status).toBe(200);
    expect(res.body).toEqual(created);
    expect(await read(created.id)).toEqual(created);
  });

  it.each([
    ['title is null', { title: null }, 'title'],
    ['title is empty', { title: '' }, 'title'],
    ['title has 101 chars', { title: 'a'.repeat(101) }, 'title'],
    ['done is null', { done: null }, 'done'],
    ['done is a string', { done: 'true' }, 'done'],
    ['dueDate is not on the calendar', { dueDate: '2026-02-30' }, 'dueDate'],
    [
      'description has 5001 chars',
      { description: 'a'.repeat(5001) },
      'description',
    ],
  ])('returns 400 and keeps the card when %s', async (_, body, field) => {
    const created = await createCard();

    const res = await patch(created.id, body);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field, message: expect.any(String) }]),
    );
    expect(await read(created.id)).toEqual(created);
  });

  it('returns 400 for an unknown property and keeps the card', async () => {
    const otherListId = await createList('Doing');
    const created = await createCard();

    const res = await patch(created.id, { listId: otherListId });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await read(created.id)).toEqual(created);
  });

  it('returns 409 card-archived on an archived card and keeps it', async () => {
    const created = await createCard();
    await archiveCard(created.id);
    const before = await read(created.id);

    const res = await patch(created.id, { title: 'Revived' });

    expectConflict(res, '/problems/card-archived');
    expect(await read(created.id)).toEqual(before);
  });

  it('returns 409 list-archived on a card of an archived list and keeps it', async () => {
    const created = await createCard();
    await archive(`lists/${listId}`);

    const res = await patch(created.id, { done: true });

    expectConflict(res, '/problems/list-archived');
    expect(await read(created.id)).toEqual(created);
  });

  it('returns 409 board-archived on a card of an archived board and keeps it', async () => {
    const created = await createCard();
    await archive(`boards/${boardId}`);

    const res = await patch(created.id, { done: true });

    expectConflict(res, '/problems/board-archived');
    expect(await read(created.id)).toEqual(created);
  });

  it("answers another user's, an unknown and a malformed id with the same 404 and keeps the foreign card", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');
    const bobsListId = await createList('Bob list', bobsBoardId, bobToken);
    const bobsCard = await createCard(
      { title: 'Bob card' },
      bobsListId,
      bobToken,
    );

    const responses = await Promise.all(
      [bobsCard.id, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
        patch(id, { title: 'Hijacked' }),
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
    const created = await createCard();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/cards/${created.id}`)
      .send({ title: 'Hijacked' });

    expect(res.status).toBe(401);
    expect(await read(created.id)).toEqual(created);
  });
});
