import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type LabelBody = {
  id: string;
  boardId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

describe('PATCH /api/v1/labels/:id (e2e)', () => {
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

  const createLabel = async (
    body: object = { name: 'Bug', color: 'red' },
    id = boardId,
    token = anaToken,
  ): Promise<LabelBody> => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/labels`)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);
    return res.body;
  };

  const patch = (id: string, body: unknown, token = anaToken) =>
    request(app.getHttpServer())
      .patch(`/api/v1/labels/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);

  // There is no single-label read route, so read through the board list.
  const read = async (
    label: LabelBody,
    token = anaToken,
  ): Promise<LabelBody | undefined> => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/boards/${label.boardId}/labels`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return (res.body as LabelBody[]).find(({ id }) => id === label.id);
  };

  const setBoardArchived = async (archived: boolean) => {
    await request(app.getHttpServer())
      .post(`/api/v1/boards/${boardId}/${archived ? 'archive' : 'unarchive'}`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
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

  it('renames with trimming and recolors with a later updatedAt', async () => {
    const created = await createLabel();

    const res = await patch(created.id, {
      name: '  Defect  ',
      color: 'orange',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...created,
      name: 'Defect',
      color: 'orange',
      updatedAt: expect.any(String),
    });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.updatedAt).getTime(),
    );
    expect(await read(created)).toEqual(res.body);
  });

  it('changes only the name when the color is absent', async () => {
    const created = await createLabel();

    const res = await patch(created.id, { name: 'Defect' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Defect');
    expect(res.body.color).toBe('red');
  });

  it('changes only the color when the name is absent', async () => {
    const created = await createLabel();

    const res = await patch(created.id, { color: 'blue' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Bug');
    expect(res.body.color).toBe('blue');
  });

  it.each([
    ['name is null', { name: null }, 'name'],
    ['name is a number', { name: 42 }, 'name'],
    ['name is whitespace-only', { name: '   ' }, 'name'],
    ['name has 51 chars', { name: 'a'.repeat(51) }, 'name'],
    ['color is null', { color: null }, 'color'],
    ['color is capitalized', { color: 'Green' }, 'color'],
    ['color is outside the palette', { color: 'white' }, 'color'],
  ])('returns 400 and keeps the label when %s', async (_, body, field) => {
    const created = await createLabel();

    const res = await patch(created.id, body);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([{ field, message: expect.any(String) }]),
    );
    expect(await read(created)).toEqual(created);
  });

  it("returns 409 label-name-taken for another label's name in any case", async () => {
    await createLabel({ name: 'Idea', color: 'blue' });
    const created = await createLabel();

    const res = await patch(created.id, { name: 'IDEA' });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/label-name-taken');
    expect(await read(created)).toEqual(created);
  });

  it('accepts a change of case on its own name', async () => {
    const created = await createLabel({ name: 'Defect', color: 'red' });

    const res = await patch(created.id, { name: 'DEFECT' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('DEFECT');
    expect(await read(created)).toEqual(res.body);
  });

  it('returns 200 with the identical label for an empty body', async () => {
    const created = await createLabel();

    const res = await patch(created.id, {});

    expect(res.status).toBe(200);
    expect(res.body).toEqual(created);
    expect(await read(created)).toEqual(created);
  });

  it('returns 400 for an unknown property and keeps the label', async () => {
    const created = await createLabel();

    const res = await patch(created.id, { boardId: UNKNOWN_ID });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await read(created)).toEqual(created);
  });

  it("answers another user's, an unknown and a malformed id with the same 404 and keeps the foreign label", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');
    const bobsLabel = await createLabel(
      { name: 'Bob label', color: 'red' },
      bobsBoardId,
      bobToken,
    );

    const responses = await Promise.all(
      [bobsLabel.id, UNKNOWN_ID, 'not-a-uuid'].map((id) =>
        patch(id, { name: 'Hijacked' }),
      ),
    );

    const bodies = responses.map((res) => {
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      const { instance: _instance, requestId: _requestId, ...rest } = res.body;
      return rest;
    });
    expect(bodies[0].type).toBe('/problems/label-not-found');
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    expect(await read(bobsLabel, bobToken)).toEqual(bobsLabel);
  });

  it('returns 409 board-archived on an archived board and keeps the label', async () => {
    const created = await createLabel();
    await setBoardArchived(true);

    const res = await patch(created.id, { name: 'Defect' });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/board-archived');
    await setBoardArchived(false);
    expect(await read(created)).toEqual(created);
  });

  it('returns 401 without an access token', async () => {
    const created = await createLabel();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/labels/${created.id}`)
      .send({ name: 'Hijacked' });

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await read(created)).toEqual(created);
  });

  it('accepts exactly one of ten concurrent renames to one name', async () => {
    const labels: LabelBody[] = [];
    for (let i = 0; i < 10; i++) {
      labels.push(await createLabel({ name: `Label ${i}`, color: 'red' }));
    }

    const responses = await Promise.all(
      labels.map((label) => patch(label.id, { name: 'Same' })),
    );

    const statuses = responses.map((res) => res.status).sort();
    expect(statuses).toEqual([200, ...Array(9).fill(409)]);
    responses
      .filter((res) => res.status === 409)
      .forEach((res) =>
        expect(res.body.type).toBe('/problems/label-name-taken'),
      );
  });
});
