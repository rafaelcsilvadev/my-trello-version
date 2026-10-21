import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('POST /api/v1/lists/:listId/cards (e2e)', () => {
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
    token: string,
    id: string,
    title: string,
  ): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title })
      .expect(201);
    return res.body.id;
  };

  const archive = (path: string) =>
    request(app.getHttpServer())
      .post(`/api/v1/${path}/archive`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

  beforeEach(async () => {
    anaToken = await register('Ana', 'ana@example.com');
    bobToken = await register('Bob', 'bob@example.com');
    boardId = await createBoard(anaToken, 'Roadmap');
    listId = await createList(anaToken, boardId, 'To do');
  });

  // Deleting the owner cascades to their boards, lists and cards (CRD-40).
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  const createCard = (
    body: Record<string, unknown>,
    id = listId,
    token = anaToken,
  ) =>
    request(app.getHttpServer())
      .post(`/api/v1/lists/${id}/cards`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const countCards = async (): Promise<number> => {
    const [{ count }] = await dataSource.query(
      'SELECT count(*)::int AS count FROM "cards"',
    );
    return count;
  };

  const expectFieldError = async (res: request.Response, field: string) => {
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field, message: expect.any(String) }]),
    );
    expect(await countCards()).toBe(0);
  };

  it('returns 201 with only the public card fields', async () => {
    const res = await createCard({ title: 'Write spec' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(UUID),
      listId,
      title: 'Write spec',
      description: null,
      dueDate: null,
      done: false,
      position: 0,
      archivedAt: null,
      createdAt: expect.stringMatching(ISO_DATE),
      updatedAt: expect.stringMatching(ISO_DATE),
      labelIds: [],
      checklist: { total: 0, done: 0 },
    });
  });

  it('stores the card in the list with a trimmed title', async () => {
    const res = await createCard({ title: '  Write spec  ' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write spec');
    const [row] = await dataSource.query(
      'SELECT "list_id", "title" FROM "cards" WHERE "id" = $1',
      [res.body.id],
    );
    expect(row).toEqual({ list_id: listId, title: 'Write spec' });
  });

  it('appends each new card at the end of the list', async () => {
    await createCard({ title: 'First' }).expect(201);

    const res = await createCard({ title: 'Second' });

    expect(res.status).toBe(201);
    expect(res.body.position).toBe(1);
  });

  it('stores a trimmed description', async () => {
    const res = await createCard({ title: 'Card', description: '  notes  ' });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('notes');
    const [row] = await dataSource.query(
      'SELECT "description" FROM "cards" WHERE "id" = $1',
      [res.body.id],
    );
    expect(row.description).toBe('notes');
  });

  it.each([
    ['whitespace-only', { description: '   ' }],
    ['missing', {}],
    ['null', { description: null }],
  ])('stores a %s description as null', async (_case, body) => {
    const res = await createCard({ title: 'Card', ...body });

    expect(res.status).toBe(201);
    expect(res.body.description).toBeNull();
    const [row] = await dataSource.query(
      'SELECT "description" FROM "cards" WHERE "id" = $1',
      [res.body.id],
    );
    expect(row.description).toBeNull();
  });

  it('accepts a 5000-character description', async () => {
    const description = 'a'.repeat(5000);

    const res = await createCard({ title: 'Card', description });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe(description);
  });

  it.each([
    ['5001 characters', 'a'.repeat(5001)],
    ['a number', 42],
  ])('returns 400 for a description that is %s', async (_case, description) => {
    await expectFieldError(
      await createCard({ title: 'Card', description }),
      'description',
    );
  });

  it.each(['2026-11-01', '2028-02-29'])(
    'stores the due date %s as given',
    async (dueDate) => {
      const res = await createCard({ title: 'Card', dueDate });

      expect(res.status).toBe(201);
      expect(res.body.dueDate).toBe(dueDate);
      const [row] = await dataSource.query(
        'SELECT to_char("due_date", \'YYYY-MM-DD\') AS "dueDate" FROM "cards" WHERE "id" = $1',
        [res.body.id],
      );
      expect(row.dueDate).toBe(dueDate);
    },
  );

  it.each([
    ['not a calendar date', '2026-02-30'],
    ['not zero-padded', '2026-2-1'],
    ['a date-time', '2026-11-01T10:00:00Z'],
    ['a number', 20261101],
  ])('returns 400 for a due date that is %s', async (_case, dueDate) => {
    await expectFieldError(
      await createCard({ title: 'Card', dueDate }),
      'dueDate',
    );
  });

  it.each([
    ['missing', {}],
    ['null', { dueDate: null }],
  ])('stores a %s due date as null', async (_case, body) => {
    const res = await createCard({ title: 'Card', ...body });

    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBeNull();
  });

  it.each([
    ['missing', {}],
    ['a number', { title: 42 }],
    ['null', { title: null }],
    ['whitespace-only', { title: '   ' }],
    ['101 characters', { title: 'a'.repeat(101) }],
  ])('returns 400 for a title that is %s', async (_case, body) => {
    await expectFieldError(await createCard(body), 'title');
  });

  it('accepts a 100-character title', async () => {
    const title = 'a'.repeat(100);

    const res = await createCard({ title });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(title);
  });

  it.each([
    ['done', { done: true }],
    ['position', { position: 3 }],
  ])('returns 400 for the unknown property %s', async (_case, extra) => {
    const res = await createCard({ title: 'Card', ...extra });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await countCards()).toBe(0);
  });

  it('returns 401 without an access token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/lists/${listId}/cards`)
      .send({ title: 'Card' });

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await countCards()).toBe(0);
  });

  it("answers another user's, an unknown and a malformed list id with the same 404", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');
    const bobsListId = await createList(bobToken, bobsBoardId, 'Bob list');

    const responses = await Promise.all(
      [bobsListId, '00000000-0000-4000-8000-000000000000', 'not-a-uuid'].map(
        (id) => createCard({ title: 'Card' }, id),
      ),
    );

    const bodies = responses.map((res) => {
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      const { instance: _instance, requestId: _requestId, ...rest } = res.body;
      return rest;
    });
    expect(bodies[0].type).toBe('/problems/list-not-found');
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    expect(await countCards()).toBe(0);
  });

  it('returns 409 list-archived for an archived list without creating the card', async () => {
    await archive(`lists/${listId}`);

    const res = await createCard({ title: 'Card' });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/list-archived');
    expect(await countCards()).toBe(0);
  });

  it('returns 409 board-archived for a list of an archived board', async () => {
    await archive(`boards/${boardId}`);

    const res = await createCard({ title: 'Card' });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/board-archived');
    expect(await countCards()).toBe(0);
  });

  it('returns 409 board-archived when both the list and its board are archived', async () => {
    await archive(`lists/${listId}`);
    await archive(`boards/${boardId}`);

    const res = await createCard({ title: 'Card' });

    expect(res.status).toBe(409);
    expect(res.body.type).toBe('/problems/board-archived');
    expect(await countCards()).toBe(0);
  });

  it('gives concurrent creates on one list distinct contiguous positions', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) => createCard({ title: `Card ${i}` })),
    );

    responses.forEach((res) => expect(res.status).toBe(201));
    const rows: { position: number }[] = await dataSource.query(
      'SELECT "position" FROM "cards" WHERE "list_id" = $1 AND "archived_at" IS NULL ORDER BY "position"',
      [listId],
    );
    expect(rows.map((row) => row.position)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });
});
