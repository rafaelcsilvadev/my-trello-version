import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;

describe('DELETE /api/v1/boards/:id (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let anaToken: string;
  let bobToken: string;

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

  beforeEach(async () => {
    anaToken = await register('Ana', 'ana@example.com');
    bobToken = await register('Bob', 'bob@example.com');
  });

  // Deleting the owner cascades to their boards (BRD-23).
  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  const createBoard = async (token: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Roadmap', description: 'Q4 plan' })
      .expect(201);
    return res.body;
  };

  const archive = async (token: string, id: string) => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/boards/${id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  };

  const remove = (token: string, id: string) =>
    request(app.getHttpServer())
      .delete(`/api/v1/boards/${id}`)
      .set('Authorization', `Bearer ${token}`);

  const read = (token: string, id: string) =>
    request(app.getHttpServer())
      .get(`/api/v1/boards/${id}`)
      .set('Authorization', `Bearer ${token}`);

  const listIds = async (token: string, query = '') => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/boards${query}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body.map((board: { id: string }) => board.id);
  };

  it('rejects deleting an active board with 409 and keeps it', async () => {
    const created = await createBoard(anaToken);

    const res = await remove(anaToken, created.id);

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/board-not-archived');
    const after = await read(anaToken, created.id).expect(200);
    expect(after.body).toEqual(created);
  });

  it('deletes an archived board with 204 and an empty body', async () => {
    const created = await createBoard(anaToken);
    await archive(anaToken, created.id);

    const res = await remove(anaToken, created.id);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    const after = await read(anaToken, created.id);
    expect(after.status).toBe(404);
    expect(after.body.type).toBe('/problems/board-not-found');
  });

  it("answers another user's, an unknown and a malformed id with 404 and keeps the foreign board", async () => {
    const bobs = await createBoard(bobToken);
    const archived = await archive(bobToken, bobs.id);

    const responses = await Promise.all(
      [bobs.id, '00000000-0000-4000-8000-000000000000', 'not-a-uuid'].map(
        (id) => remove(anaToken, id),
      ),
    );

    for (const res of responses) {
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.type).toBe('/problems/board-not-found');
    }
    const after = await read(bobToken, bobs.id).expect(200);
    expect(after.body).toEqual(archived);
  });

  it('returns 401 without an access token and keeps the board', async () => {
    const created = await createBoard(anaToken);
    const archived = await archive(anaToken, created.id);

    const res = await request(app.getHttpServer()).delete(
      `/api/v1/boards/${created.id}`,
    );

    expect(res.status).toBe(401);
    const after = await read(anaToken, created.id).expect(200);
    expect(after.body).toEqual(archived);
  });

  it('runs the create, list, archive and delete lifecycle end to end', async () => {
    const created = await createBoard(anaToken);
    expect(await listIds(anaToken)).toEqual([created.id]);

    await archive(anaToken, created.id);
    expect(await listIds(anaToken)).toEqual([]);
    expect(await listIds(anaToken, '?archived=true')).toEqual([created.id]);

    await remove(anaToken, created.id).expect(204);
    expect(await listIds(anaToken)).toEqual([]);
    expect(await listIds(anaToken, '?archived=true')).toEqual([]);
    await read(anaToken, created.id).expect(404);
  });
});
