import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;

describe('GET /api/v1/boards/:boardId/labels (e2e)', () => {
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

  const createLabel = async (name: string, color: string) => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/boards/${boardId}/labels`)
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ name, color })
      .expect(201);
    return res.body;
  };

  const listLabels = (id = boardId, token = anaToken) =>
    request(app.getHttpServer())
      .get(`/api/v1/boards/${id}/labels`)
      .set('Authorization', `Bearer ${token}`);

  beforeEach(async () => {
    anaToken = await register('Ana', 'ana@example.com');
    bobToken = await register('Bob', 'bob@example.com');
    boardId = await createBoard(anaToken, 'Roadmap');
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the labels of the board in creation order', async () => {
    const bug = await createLabel('Bug', 'red');
    const idea = await createLabel('Idea', 'yellow');
    const chore = await createLabel('Chore', 'black');

    const res = await listLabels();

    expect(res.status).toBe(200);
    expect(res.body).toEqual([bug, idea, chore]);
  });

  it('returns the same labels after the board is archived', async () => {
    const bug = await createLabel('Bug', 'red');
    const idea = await createLabel('Idea', 'yellow');
    await request(app.getHttpServer())
      .post(`/api/v1/boards/${boardId}/archive`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

    const res = await listLabels();

    expect(res.status).toBe(200);
    expect(res.body).toEqual([bug, idea]);
  });

  it('returns an empty array for a board without labels', async () => {
    const res = await listLabels();

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 401 without an access token', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/boards/${boardId}/labels`,
    );

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
  });

  it("answers another user's, an unknown and a malformed board id with the same 404 as POST", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');
    const unknownId = '00000000-0000-4000-8000-000000000000';

    const responses = await Promise.all([
      ...[bobsBoardId, unknownId, 'not-a-uuid'].map((id) => listLabels(id)),
      request(app.getHttpServer())
        .post(`/api/v1/boards/${unknownId}/labels`)
        .set('Authorization', `Bearer ${anaToken}`)
        .send({ name: 'Bug', color: 'red' }),
    ]);

    const bodies = responses.map((res) => {
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      const { instance: _instance, requestId: _requestId, ...rest } = res.body;
      return rest;
    });
    expect(bodies[0].type).toBe('/problems/board-not-found');
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    expect(bodies[3]).toEqual(bodies[0]);
  });
});
