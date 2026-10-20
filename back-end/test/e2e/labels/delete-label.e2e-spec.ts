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

describe('DELETE /api/v1/labels/:id (e2e)', () => {
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

  const remove = (id: string, token = anaToken) =>
    request(app.getHttpServer())
      .delete(`/api/v1/labels/${id}`)
      .set('Authorization', `Bearer ${token}`);

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

  it('returns 204 with no body and drops the label from the board list', async () => {
    const kept = await createLabel({ name: 'Idea', color: 'blue' });
    const created = await createLabel();

    const res = await remove(created.id);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(res.text).toBe('');
    expect(await read(created)).toBeUndefined();
    expect(await read(kept)).toEqual(kept);
  });

  it('returns 404 label-not-found on a second delete', async () => {
    const created = await createLabel();
    await remove(created.id).expect(204);

    const res = await remove(created.id);

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/label-not-found');
  });

  it("answers another user's, an unknown and a malformed id with the same 404 and keeps the foreign label", async () => {
    const bobsBoardId = await createBoard(bobToken, 'Bob board');
    const bobsLabel = await createLabel(
      { name: 'Bob label', color: 'red' },
      bobsBoardId,
      bobToken,
    );

    const responses = await Promise.all(
      [bobsLabel.id, UNKNOWN_ID, 'not-a-uuid'].map((id) => remove(id)),
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

    const res = await remove(created.id);

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.type).toBe('/problems/board-archived');
    await setBoardArchived(false);
    expect(await read(created)).toEqual(created);
  });

  it('returns 401 without an access token and keeps the label', async () => {
    const created = await createLabel();

    const res = await request(app.getHttpServer()).delete(
      `/api/v1/labels/${created.id}`,
    );

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(await read(created)).toEqual(created);
  });

  it('accepts exactly one of ten concurrent deletes of one label', async () => {
    const created = await createLabel();

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => remove(created.id)),
    );

    const statuses = responses.map((res) => res.status).sort((a, b) => a - b);
    expect(statuses).toEqual([204, ...Array(9).fill(404)]);
    expect(await read(created)).toBeUndefined();
  });
});
