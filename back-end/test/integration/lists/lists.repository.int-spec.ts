import type { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { List } from '../../../src/lists/list.entity';
import { ListsModule } from '../../../src/lists/lists.module';
import { ListsRepository } from '../../../src/lists/lists.repository';
import { bootWithDatabase } from '../../support/boot-with-database';
import { revertAllMigrations } from '../../support/revert-all-migrations';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('ListsRepository', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let listsRepository: ListsRepository;
  let ana: string;
  let bruno: string;
  let board: string;
  let otherBoard: string;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([ListsModule]);
    dataSource = moduleRef.get(DataSource);
    listsRepository = moduleRef.get(ListsRepository);
  });

  beforeEach(async () => {
    ana = await insertUser('ana@example.com');
    bruno = await insertUser('bruno@example.com');
    board = await insertBoard(ana, 'Roadmap');
    otherBoard = await insertBoard(ana, 'Chores');
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "lists"');
    await dataSource.query('DELETE FROM "boards"');
    await dataSource.query('DELETE FROM "users"');
  });

  // Leave the shared database without migrations, as other suites assert the
  // exact migration history.
  afterAll(async () => {
    await revertAllMigrations(dataSource);
    await moduleRef.close();
  });

  async function insertUser(email: string): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "users" ("name", "email", "password_hash")
       VALUES ('User', $1, 'hash') RETURNING "id"`,
      [email],
    );
    return row.id;
  }

  async function insertBoard(ownerId: string, title: string): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "boards" ("owner_id", "title") VALUES ($1, $2)
       RETURNING "id"`,
      [ownerId, title],
    );
    return row.id;
  }

  async function insertList(
    boardId: string,
    title: string,
    state: { position: number } | { archivedAt: string },
  ): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "lists" ("board_id", "title", "position", "archived_at")
       VALUES ($1, $2, $3, $4) RETURNING "id"`,
      [
        boardId,
        title,
        'position' in state ? state.position : null,
        'archivedAt' in state ? state.archivedAt : null,
      ],
    );
    return row.id;
  }

  async function positionsByTitle(
    boardId: string,
  ): Promise<Record<string, number | null>> {
    const rows = await dataSource.query<
      { title: string; position: number | null }[]
    >(`SELECT "title", "position" FROM "lists" WHERE "board_id" = $1`, [
      boardId,
    ]);
    return Object.fromEntries(rows.map((row) => [row.title, row.position]));
  }

  function titles(lists: List[]): string[] {
    return lists.map((list) => list.title);
  }

  describe('create', () => {
    it('returns the stored list with generated id and dates and no archivedAt', async () => {
      const list = await listsRepository.create({
        boardId: board,
        title: 'To do',
        position: 0,
      });

      expect(list).toMatchObject({
        boardId: board,
        title: 'To do',
        position: 0,
        archivedAt: null,
      });
      expect(list.id).toMatch(UUID);
      expect(list.createdAt).toBeInstanceOf(Date);
      expect(list.updatedAt).toBeInstanceOf(Date);
      expect(await listsRepository.findOwned(ana, list.id)).toEqual(list);
    });
  });

  describe('findOwned', () => {
    it("returns the list for its board's owner", async () => {
      const id = await insertList(board, 'To do', { position: 0 });

      expect(await listsRepository.findOwned(ana, id)).toMatchObject({
        id,
        boardId: board,
        title: 'To do',
        position: 0,
        archivedAt: null,
      });
    });

    it('returns null when the board belongs to another owner', async () => {
      const id = await insertList(board, 'To do', { position: 0 });

      expect(await listsRepository.findOwned(bruno, id)).toBeNull();
    });

    it('returns null for an unknown id', async () => {
      expect(await listsRepository.findOwned(ana, UNKNOWN_ID)).toBeNull();
    });
  });

  describe('listInBoard', () => {
    it("returns only the board's active lists by position, ascending", async () => {
      await insertList(board, 'Done', { position: 2 });
      await insertList(board, 'To do', { position: 0 });
      await insertList(board, 'Doing', { position: 1 });
      await insertList(board, 'Archived', {
        archivedAt: '2026-01-01T00:00:00Z',
      });
      await insertList(otherBoard, 'Foreign', { position: 3 });

      expect(titles(await listsRepository.listInBoard(board, false))).toEqual([
        'To do',
        'Doing',
        'Done',
      ]);
    });

    it("returns only the board's archived lists, newest archivedAt first", async () => {
      await insertList(board, 'Active', { position: 0 });
      await insertList(board, 'Old', { archivedAt: '2026-01-01T00:00:00Z' });
      await insertList(board, 'New', { archivedAt: '2026-03-01T00:00:00Z' });
      await insertList(board, 'Middle', {
        archivedAt: '2026-02-01T00:00:00Z',
      });
      await insertList(otherBoard, 'Foreign', {
        archivedAt: '2026-04-01T00:00:00Z',
      });

      expect(titles(await listsRepository.listInBoard(board, true))).toEqual([
        'New',
        'Middle',
        'Old',
      ]);
    });

    it('breaks an archivedAt tie by id, descending', async () => {
      const sameTime = { archivedAt: '2026-01-01T00:00:00Z' };
      const ids = [
        await insertList(board, 'A', sameTime),
        await insertList(board, 'B', sameTime),
        await insertList(board, 'C', sameTime),
      ];

      const listed = await listsRepository.listInBoard(board, true);

      expect(listed.map((list) => list.id)).toEqual(ids.sort().reverse());
    });
  });

  describe('countActive', () => {
    it("counts only the board's active lists", async () => {
      await insertList(board, 'To do', { position: 0 });
      await insertList(board, 'Doing', { position: 1 });
      await insertList(board, 'Archived', {
        archivedAt: '2026-01-01T00:00:00Z',
      });
      await insertList(otherBoard, 'Foreign', { position: 0 });

      expect(await listsRepository.countActive(board)).toBe(2);
    });
  });

  describe('shift', () => {
    it('adds 1 to exactly the positions in [from, to] of that board', async () => {
      for (const [position, title] of ['A', 'B', 'C', 'D'].entries()) {
        await insertList(board, title, { position });
        await insertList(otherBoard, `other ${title}`, { position });
      }

      await listsRepository.shift(board, 2, 3, 1);

      expect(await positionsByTitle(board)).toEqual({
        A: 0,
        B: 1,
        C: 3,
        D: 4,
      });
      expect(await positionsByTitle(otherBoard)).toEqual({
        'other A': 0,
        'other B': 1,
        'other C': 2,
        'other D': 3,
      });
    });

    it('subtracts 1 from exactly the positions in [from, to] of that board', async () => {
      await insertList(board, 'A', { position: 0 });
      await insertList(board, 'C', { position: 2 });
      await insertList(board, 'D', { position: 3 });
      await insertList(board, 'E', { position: 5 });
      await insertList(otherBoard, 'other', { position: 2 });

      await listsRepository.shift(board, 2, 3, -1);

      expect(await positionsByTitle(board)).toEqual({
        A: 0,
        C: 1,
        D: 2,
        E: 5,
      });
      expect(await positionsByTitle(otherBoard)).toEqual({ other: 2 });
    });

    it('keeps updatedAt of the shifted lists', async () => {
      const id = await insertList(board, 'A', { position: 0 });
      const updatedAt = new Date('2026-01-01T00:00:00Z');
      await dataSource.query(
        `UPDATE "lists" SET "updated_at" = $2 WHERE "id" = $1`,
        [id, updatedAt],
      );

      await listsRepository.shift(board, 0, 0, 1);

      expect(await listsRepository.findOwned(ana, id)).toMatchObject({
        position: 1,
        updatedAt,
      });
    });
  });

  describe('save', () => {
    it('persists a changed title, position and archivedAt', async () => {
      const id = await insertList(board, 'To do', { position: 0 });
      const list = (await listsRepository.findOwned(ana, id))!;
      const archivedAt = new Date('2026-05-01T12:00:00Z');
      list.title = 'Backlog';
      list.position = null;
      list.archivedAt = archivedAt;

      await listsRepository.save(list);

      expect(await listsRepository.findOwned(ana, id)).toMatchObject({
        title: 'Backlog',
        position: null,
        archivedAt,
      });
    });
  });

  describe('delete', () => {
    it('removes only the given list', async () => {
      const id = await insertList(board, 'Archived', {
        archivedAt: '2026-01-01T00:00:00Z',
      });
      const kept = await insertList(board, 'To do', { position: 0 });

      await listsRepository.delete(id);

      expect(await listsRepository.findOwned(ana, id)).toBeNull();
      expect(await listsRepository.findOwned(ana, kept)).not.toBeNull();
    });
  });

  describe('lockOwnedBoard', () => {
    it('returns the board for its owner', async () => {
      const locked = await listsRepository.transaction((lists) =>
        lists.lockOwnedBoard(ana, board),
      );

      expect(locked).toMatchObject({ id: board, ownerId: ana });
    });

    it('returns null when the board belongs to another owner', async () => {
      const locked = await listsRepository.transaction((lists) =>
        lists.lockOwnedBoard(bruno, board),
      );

      expect(locked).toBeNull();
    });

    it('makes a second lock on the same board wait until the first commits', async () => {
      const events: string[] = [];
      let release!: () => void;
      const released = new Promise<void>((resolve) => (release = resolve));
      let firstLocked!: () => void;
      const locked = new Promise<void>((resolve) => (firstLocked = resolve));

      const first = listsRepository.transaction(async (lists) => {
        await lists.lockOwnedBoard(ana, board);
        firstLocked();
        await released;
        events.push('first done');
      });
      await locked;
      const second = listsRepository.transaction(async (lists) => {
        await lists.lockOwnedBoard(ana, board);
        events.push('second locked');
      });
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(events).toEqual([]);

      release();
      await Promise.all([first, second]);

      expect(events).toEqual(['first done', 'second locked']);
    });
  });

  describe('transaction', () => {
    it('rolls back every write when work throws', async () => {
      await insertList(board, 'A', { position: 0 });
      const failure = new Error('boom');

      await expect(
        listsRepository.transaction(async (lists) => {
          await lists.shift(board, 0, 0, 1);
          await lists.create({ boardId: board, title: 'B', position: 0 });
          throw failure;
        }),
      ).rejects.toBe(failure);

      expect(await positionsByTitle(board)).toEqual({ A: 0 });
    });
  });
});
