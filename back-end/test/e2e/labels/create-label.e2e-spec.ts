import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const PALETTE = [
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'blue',
  'sky',
  'lime',
  'pink',
  'black',
];

describe('POST /api/v1/boards/:boardId/labels (e2e)', () => {
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

  // Deleting the owner cascades to their boards and labels (LBL-33).
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  const createLabel = (
    body: Record<string, unknown>,
    id = boardId,
    token = anaToken,
  ) =>
    request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/labels`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const countLabels = async (): Promise<number> => {
    const [{ count }] = await dataSource.query(
      'SELECT count(*)::int AS count FROM "labels"',
    );
    return count;
  };

  const expectFieldError = async (res: request.Response, field: string) => {
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field, message: expect.any(String) }]),
    );
    expect(await countLabels()).toBe(0);
  };

  it('returns 201 with only the public label fields', async () => {
    const res = await createLabel({ name: 'Bug', color: 'red' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(UUID),
      boardId,
      name: 'Bug',
      color: 'red',
      createdAt: expect.stringMatching(ISO_DATE),
      updatedAt: expect.stringMatching(ISO_DATE),
    });
  });

  it('stores the label on the board with a trimmed name', async () => {
    const res = await createLabel({ name: '  Bug  ', color: 'red' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Bug');
    const [row] = await dataSource.query(
      'SELECT "board_id", "name", "color" FROM "labels" WHERE "id" = $1',
      [res.body.id],
    );
    expect(row).toEqual({ board_id: boardId, name: 'Bug', color: 'red' });
  });

  it.each([
    ['missing', { color: 'red' }],
    ['a number', { name: 42, color: 'red' }],
    ['null', { name: null, color: 'red' }],
    ['whitespace-only', { name: '   ', color: 'red' }],
    ['51 characters', { name: 'a'.repeat(51), color: 'red' }],
    [
      '51 characters after trim',
      { name: `  ${'a'.repeat(51)}  `, color: 'red' },
    ],
  ])('returns 400 for a name that is %s', async (_case, body) => {
    await expectFieldError(await createLabel(body), 'name');
  });

  it('accepts a 50-character name', async () => {
    const name = 'a'.repeat(50);

    const res = await createLabel({ name, color: 'red' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(name);
  });

  it('checks the 50-character limit after trimming', async () => {
    const name = 'a'.repeat(50);

    const res = await createLabel({ name: `  ${name}  `, color: 'red' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(name);
  });

  it.each(PALETTE)('accepts the palette color %s', async (color) => {
    const res = await createLabel({ name: 'Label', color });

    expect(res.status).toBe(201);
    expect(res.body.color).toBe(color);
  });

  it.each([
    ['missing', { name: 'Bug' }],
    ['capitalized', { name: 'Bug', color: 'Green' }],
    ['outside the palette', { name: 'Bug', color: 'white' }],
    ['a hex code', { name: 'Bug', color: '#ff0000' }],
    ['a number', { name: 'Bug', color: 1 }],
  ])('returns 400 for a color that is %s', async (_case, body) => {
    await expectFieldError(await createLabel(body), 'color');
  });

  it('returns 409 label-name-taken for a name already on the board, ignoring case', async () => {
    await createLabel({ name: 'Bug', color: 'red' }).expect(201);

    const res = await createLabel({ name: 'bug', color: 'blue' });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/label-name-taken');
    expect(await countLabels()).toBe(1);
  });

  it('accepts a name already used on another board', async () => {
    const otherBoardId = await createBoard(anaToken, 'Other');
    await createLabel({ name: 'Bug', color: 'red' }).expect(201);

    const res = await createLabel({ name: 'Bug', color: 'red' }, otherBoardId);

    expect(res.status).toBe(201);
    expect(res.body.boardId).toBe(otherBoardId);
  });

  it.each([
    ['boardId', { boardId: '00000000-0000-4000-8000-000000000000' }],
    ['id', { id: '00000000-0000-4000-8000-000000000000' }],
  ])('returns 400 for the unknown property %s', async (_case, extra) => {
    const res = await createLabel({ name: 'Bug', color: 'red', ...extra });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await countLabels()).toBe(0);
  });

  it('returns 401 without an access token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/boards/${boardId}/labels`)
      .send({ name: 'Bug', color: 'red' });

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await countLabels()).toBe(0);
  });

  it("answers another user's, an unknown and a malformed board id with the same 404", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');

    const responses = await Promise.all(
      [bobsBoardId, '00000000-0000-4000-8000-000000000000', 'not-a-uuid'].map(
        (id) => createLabel({ name: 'Bug', color: 'red' }, id),
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
    expect(await countLabels()).toBe(0);
  });

  it('returns 409 board-archived for an archived board without creating the label', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/boards/${boardId}/archive`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

    const res = await createLabel({ name: 'Bug', color: 'red' });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/board-archived');
    expect(await countLabels()).toBe(0);
  });

  it('accepts exactly one of ten concurrent creates of one name', async () => {
    const names = [
      'Bug',
      'BUG',
      'bug',
      'bUG',
      'BuG',
      'bUg',
      'buG',
      'BUg',
      ' Bug',
      'bug ',
    ];

    const responses = await Promise.all(
      names.map((name) => createLabel({ name, color: 'red' })),
    );

    const statuses = responses.map((res) => res.status).sort((a, b) => a - b);
    expect(statuses).toEqual([201, ...Array(9).fill(409)]);
    responses
      .filter((res) => res.status === 409)
      .forEach((res) =>
        expect(res.body.type).toBe('/problems/label-name-taken'),
      );
    const list = await request(app.getHttpServer())
      .get(`/api/v1/boards/${boardId}/labels`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);
  });
});
