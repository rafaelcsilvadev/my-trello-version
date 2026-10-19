import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('POST /api/v1/boards (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'correct horse',
      })
      .expect(201);
    token = res.body.accessToken;
  });

  // Deleting the owner cascades to their boards (BRD-23).
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  const createBoard = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/v1/boards')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const countBoards = async (): Promise<number> => {
    const [{ count }] = await dataSource.query(
      'SELECT count(*)::int AS count FROM "boards"',
    );
    return count;
  };

  const expectFieldError = async (
    res: request.Response,
    field: 'title' | 'description',
  ) => {
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field, message: expect.any(String) }]),
    );
    expect(await countBoards()).toBe(0);
  };

  it('returns 201 with only the public board fields', async () => {
    const res = await createBoard({ title: 'Roadmap', description: 'Q4' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(UUID),
      title: 'Roadmap',
      description: 'Q4',
      archivedAt: null,
      createdAt: expect.stringMatching(ISO_DATE),
      updatedAt: expect.stringMatching(ISO_DATE),
    });
  });

  it('stores the board for the caller with a trimmed title', async () => {
    const res = await createBoard({ title: '  Roadmap  ' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Roadmap');
    const [row] = await dataSource.query(
      'SELECT b."title", u."email" FROM "boards" b JOIN "users" u ON u."id" = b."owner_id" WHERE b."id" = $1',
      [res.body.id],
    );
    expect(row).toEqual({ title: 'Roadmap', email: 'ana@example.com' });
  });

  it('trims the description', async () => {
    const res = await createBoard({ title: 'Roadmap', description: '  Q4  ' });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('Q4');
  });

  it.each([
    ['missing', {}],
    ['empty', { description: '' }],
    ['whitespace-only', { description: '   ' }],
    ['null', { description: null }],
  ])('stores a %s description as null', async (_case, extra) => {
    const res = await createBoard({ title: 'Roadmap', ...extra });

    expect(res.status).toBe(201);
    expect(res.body.description).toBeNull();
    const [row] = await dataSource.query(
      'SELECT "description" FROM "boards" WHERE "id" = $1',
      [res.body.id],
    );
    expect(row.description).toBeNull();
  });

  it.each([
    ['missing', {}],
    ['a number', { title: 42 }],
    ['null', { title: null }],
    ['empty', { title: '' }],
    ['whitespace-only', { title: '   ' }],
    ['101 characters', { title: 'a'.repeat(101) }],
  ])('returns 400 for a title that is %s', async (_case, body) => {
    await expectFieldError(await createBoard(body), 'title');
  });

  it('accepts a 100-character title, measured after trim', async () => {
    const title = 'a'.repeat(100);

    const res = await createBoard({ title: `  ${title}  ` });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(title);
  });

  it.each([
    ['a number', { description: 42 }],
    ['1001 characters', { description: 'a'.repeat(1001) }],
  ])('returns 400 for a description that is %s', async (_case, extra) => {
    await expectFieldError(
      await createBoard({ title: 'Roadmap', ...extra }),
      'description',
    );
  });

  it('accepts a 1000-character description, measured after trim', async () => {
    const description = 'a'.repeat(1000);

    const res = await createBoard({
      title: 'Roadmap',
      description: ` ${description} `,
    });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe(description);
  });

  it('returns 400 for an unknown property such as archivedAt', async () => {
    const res = await createBoard({
      title: 'Roadmap',
      archivedAt: new Date().toISOString(),
    });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await countBoards()).toBe(0);
  });

  it('returns 401 without an access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/boards')
      .send({ title: 'Roadmap' });

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await countBoards()).toBe(0);
  });
});
