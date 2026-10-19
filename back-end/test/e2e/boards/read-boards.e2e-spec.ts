import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../support/create-test-app';

const PROBLEM_JSON = /^application\/problem\+json/;

describe('GET /api/v1/boards (e2e)', () => {
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

  const createBoard = async (token: string, title: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title })
      .expect(201);
    return res.body;
  };

  // The archive endpoint comes later (T9), so archive straight in the table.
  const archiveBoard = async (id: string) => {
    await dataSource.query(
      'UPDATE "boards" SET "archived_at" = now() WHERE "id" = $1',
      [id],
    );
  };

  const get = (token: string, path: string) =>
    request(app.getHttpServer())
      .get(`/api/v1/boards${path}`)
      .set('Authorization', `Bearer ${token}`);

  const titles = (res: request.Response): string[] =>
    res.body.map((board: { title: string }) => board.title);

  describe('list', () => {
    it('returns 200 with an empty array when the caller has no boards', async () => {
      const res = await get(anaToken, '');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns only the caller's active boards, newest first", async () => {
      await createBoard(anaToken, 'Ana 1');
      await createBoard(bobToken, 'Bob 1');
      await createBoard(anaToken, 'Ana 2');
      const archived = await createBoard(anaToken, 'Ana archived');
      await archiveBoard(archived.id);
      await createBoard(bobToken, 'Bob 2');

      const ana = await get(anaToken, '');
      const bob = await get(bobToken, '');

      expect(ana.status).toBe(200);
      expect(titles(ana)).toEqual(['Ana 2', 'Ana 1']);
      expect(titles(bob)).toEqual(['Bob 2', 'Bob 1']);
    });

    it('returns boards with only the public fields', async () => {
      const created = await createBoard(anaToken, 'Roadmap');

      const res = await get(anaToken, '');

      expect(res.body).toEqual([created]);
    });

    it('treats archived=false like the default', async () => {
      await createBoard(anaToken, 'Ana 1');
      const archived = await createBoard(anaToken, 'Ana archived');
      await archiveBoard(archived.id);
      await createBoard(anaToken, 'Ana 2');

      const res = await get(anaToken, '?archived=false');

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['Ana 2', 'Ana 1']);
    });

    it("returns only the caller's archived boards for archived=true, newest first", async () => {
      await createBoard(anaToken, 'Ana active');
      const first = await createBoard(anaToken, 'Ana archived 1');
      const second = await createBoard(anaToken, 'Ana archived 2');
      const bobs = await createBoard(bobToken, 'Bob archived');
      await Promise.all([first, second, bobs].map((b) => archiveBoard(b.id)));

      const res = await get(anaToken, '?archived=true');

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['Ana archived 2', 'Ana archived 1']);
      expect(res.body[0].archivedAt).not.toBeNull();
    });

    it.each(['yes', '1', 'TRUE', ''])(
      'returns 400 for archived=%s',
      async (value) => {
        const res = await get(anaToken, `?archived=${value}`);

        expect(res.status).toBe(400);
        expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            { field: 'archived', message: expect.any(String) },
          ]),
        );
      },
    );

    it('returns 401 without an access token', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/boards');

      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    });
  });

  describe('read', () => {
    it('returns 200 with an own active board', async () => {
      const created = await createBoard(anaToken, 'Roadmap');

      const res = await get(anaToken, `/${created.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(created);
    });

    it('returns 200 with an own archived board', async () => {
      const created = await createBoard(anaToken, 'Roadmap');
      await archiveBoard(created.id);

      const res = await get(anaToken, `/${created.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.archivedAt).not.toBeNull();
    });

    it("answers another user's, an unknown and a malformed id with the same 404", async () => {
      const bobs = await createBoard(bobToken, 'Bob board');

      const responses = await Promise.all(
        [bobs.id, '00000000-0000-4000-8000-000000000000', 'not-a-uuid'].map(
          (id) => get(anaToken, `/${id}`),
        ),
      );

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
      expect(bodies[0].type).toBe('/problems/board-not-found');
      expect(bodies[1]).toEqual(bodies[0]);
      expect(bodies[2]).toEqual(bodies[0]);
    });

    it('returns 401 without an access token', async () => {
      const created = await createBoard(anaToken, 'Roadmap');

      const res = await request(app.getHttpServer()).get(
        `/api/v1/boards/${created.id}`,
      );

      expect(res.status).toBe(401);
    });
  });
});
