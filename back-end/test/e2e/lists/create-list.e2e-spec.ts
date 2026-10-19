import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('POST /api/v1/boards/:boardId/lists (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let anaToken: string;
  let bobToken: string;
  let boardId: string;

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

  beforeEach(async () => {
    anaToken = await register('Ana', 'ana@example.com');
    bobToken = await register('Bob', 'bob@example.com');
    boardId = await createBoard(anaToken, 'Roadmap');
  });

  // Deleting the owner cascades to their boards and lists (LST-29).
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  const createList = (
    body: Record<string, unknown>,
    id = boardId,
    token = anaToken,
  ) =>
    request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const countLists = async (): Promise<number> => {
    const [{ count }] = await dataSource.query(
      'SELECT count(*)::int AS count FROM "lists"',
    );
    return count;
  };

  const expectTitleError = async (res: request.Response) => {
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field: 'title', message: expect.any(String) }]),
    );
    expect(await countLists()).toBe(0);
  };

  it('returns 201 with only the public list fields', async () => {
    const res = await createList({ title: 'To do' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(UUID),
      boardId,
      title: 'To do',
      position: 0,
      archivedAt: null,
      createdAt: expect.stringMatching(ISO_DATE),
      updatedAt: expect.stringMatching(ISO_DATE),
    });
  });

  it('stores the list in the board with a trimmed title', async () => {
    const res = await createList({ title: '  To do  ' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('To do');
    const [row] = await dataSource.query(
      'SELECT "board_id", "title" FROM "lists" WHERE "id" = $1',
      [res.body.id],
    );
    expect(row).toEqual({ board_id: boardId, title: 'To do' });
  });

  it('appends each new list at the end of the board', async () => {
    await createList({ title: 'To do' }).expect(201);

    const res = await createList({ title: 'Doing' });

    expect(res.status).toBe(201);
    expect(res.body.position).toBe(1);
  });

  it.each([
    ['missing', {}],
    ['a number', { title: 42 }],
    ['null', { title: null }],
    ['whitespace-only', { title: '   ' }],
    ['101 characters', { title: 'a'.repeat(101) }],
  ])('returns 400 for a title that is %s', async (_case, body) => {
    await expectTitleError(await createList(body));
  });

  it('accepts a 100-character title', async () => {
    const title = 'a'.repeat(100);

    const res = await createList({ title });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(title);
  });

  it('returns 400 for an unknown property such as position', async () => {
    const res = await createList({ title: 'To do', position: 3 });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await countLists()).toBe(0);
  });

  it('returns 401 without an access token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/boards/${boardId}/lists`)
      .send({ title: 'To do' });

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await countLists()).toBe(0);
  });

  it("answers another user's, an unknown and a malformed board id with the same 404", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');

    const responses = await Promise.all(
      [bobsBoardId, '00000000-0000-4000-8000-000000000000', 'not-a-uuid'].map(
        (id) => createList({ title: 'To do' }, id),
      ),
    );

    const bodies = responses.map((res) => {
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      const { instance: _instance, requestId: _requestId, ...rest } = res.body;
      return rest;
    });
    expect(bodies[0].type).toBe('/problems/board-not-found');
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    expect(await countLists()).toBe(0);
  });

  it('returns 409 for an archived board without creating the list', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/boards/${boardId}/archive`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

    const res = await createList({ title: 'To do' });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/board-archived');
    expect(await countLists()).toBe(0);
  });

  it('gives concurrent creates on one board distinct contiguous positions', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) => createList({ title: `List ${i}` })),
    );

    responses.forEach((res) => expect(res.status).toBe(201));
    const rows: { position: number }[] = await dataSource.query(
      'SELECT "position" FROM "lists" WHERE "board_id" = $1 AND "archived_at" IS NULL ORDER BY "position"',
      [boardId],
    );
    expect(rows.map((row) => row.position)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });
});
