import type { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Board } from '../../../src/boards/board.entity';
import { BoardsModule } from '../../../src/boards/boards.module';
import { BoardsRepository } from '../../../src/boards/boards.repository';
import { bootWithDatabase } from '../../support/boot-with-database';
import { revertAllMigrations } from '../../support/revert-all-migrations';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('BoardsRepository', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let boardsRepository: BoardsRepository;
  let ana: string;
  let bruno: string;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([BoardsModule]);
    dataSource = moduleRef.get(DataSource);
    boardsRepository = moduleRef.get(BoardsRepository);
  });

  beforeEach(async () => {
    ana = await insertUser('ana@example.com');
    bruno = await insertUser('bruno@example.com');
  });

  afterEach(async () => {
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

  async function createBoard(
    ownerId: string,
    title: string,
    options: { createdAt?: string; archived?: boolean } = {},
  ): Promise<Board> {
    const board = await boardsRepository.create({
      ownerId,
      title,
      description: null,
    });
    await dataSource.query(
      `UPDATE "boards"
       SET "created_at" = COALESCE($2::timestamptz, "created_at"),
           "archived_at" = CASE WHEN $3 THEN now() ELSE NULL END
       WHERE "id" = $1`,
      [board.id, options.createdAt ?? null, options.archived ?? false],
    );
    return board;
  }

  function titles(boards: Board[]): string[] {
    return boards.map((board) => board.title);
  }

  describe('create', () => {
    it('returns the stored board with generated id and dates and no archivedAt', async () => {
      const board = await boardsRepository.create({
        ownerId: ana,
        title: 'Roadmap',
        description: 'Q4 plans',
      });

      expect(board).toMatchObject({
        ownerId: ana,
        title: 'Roadmap',
        description: 'Q4 plans',
        archivedAt: null,
      });
      expect(board.id).toMatch(UUID);
      expect(board.createdAt).toBeInstanceOf(Date);
      expect(board.updatedAt).toBeInstanceOf(Date);
      expect(await boardsRepository.findOwned(ana, board.id)).toEqual(board);
    });
  });

  describe('findOwned', () => {
    it('returns the board for its owner', async () => {
      const board = await boardsRepository.create({
        ownerId: ana,
        title: 'Roadmap',
        description: null,
      });

      expect(await boardsRepository.findOwned(ana, board.id)).toEqual(board);
    });

    it('returns null when the board belongs to another owner', async () => {
      const board = await createBoard(ana, 'Roadmap');

      expect(await boardsRepository.findOwned(bruno, board.id)).toBeNull();
    });

    it('returns null for an unknown id', async () => {
      expect(await boardsRepository.findOwned(ana, UNKNOWN_ID)).toBeNull();
    });
  });

  describe('listOwned', () => {
    it("returns only the owner's active boards, newest first", async () => {
      await createBoard(ana, 'Old', { createdAt: '2026-01-01T00:00:00Z' });
      await createBoard(ana, 'New', { createdAt: '2026-03-01T00:00:00Z' });
      await createBoard(ana, 'Middle', { createdAt: '2026-02-01T00:00:00Z' });
      await createBoard(ana, 'Archived', { archived: true });
      await createBoard(bruno, 'Foreign');

      expect(titles(await boardsRepository.listOwned(ana, false))).toEqual([
        'New',
        'Middle',
        'Old',
      ]);
    });

    it("returns only the owner's archived boards when archived is true", async () => {
      await createBoard(ana, 'Active');
      await createBoard(ana, 'Old archived', {
        archived: true,
        createdAt: '2026-01-01T00:00:00Z',
      });
      await createBoard(ana, 'New archived', {
        archived: true,
        createdAt: '2026-02-01T00:00:00Z',
      });
      await createBoard(bruno, 'Foreign archived', { archived: true });

      expect(titles(await boardsRepository.listOwned(ana, true))).toEqual([
        'New archived',
        'Old archived',
      ]);
    });

    it('breaks a created_at tie by id, descending', async () => {
      const sameTime = { createdAt: '2026-01-01T00:00:00Z' };
      const boards = [
        await createBoard(ana, 'A', sameTime),
        await createBoard(ana, 'B', sameTime),
        await createBoard(ana, 'C', sameTime),
      ];
      const expected = boards
        .map((board) => board.id)
        .sort()
        .reverse();

      const listed = await boardsRepository.listOwned(ana, false);

      expect(listed.map((board) => board.id)).toEqual(expected);
    });

    it('returns an empty list when the owner has no boards', async () => {
      await createBoard(bruno, 'Foreign');

      expect(await boardsRepository.listOwned(ana, false)).toEqual([]);
    });
  });

  describe('save', () => {
    it('persists a changed title and archivedAt', async () => {
      const { id } = await createBoard(ana, 'Roadmap');
      const board = (await boardsRepository.findOwned(ana, id))!;
      const archivedAt = new Date('2026-05-01T12:00:00Z');
      board.title = 'Plans';
      board.archivedAt = archivedAt;

      await boardsRepository.save(board);

      expect(await boardsRepository.findOwned(ana, id)).toMatchObject({
        title: 'Plans',
        archivedAt,
      });
    });
  });

  describe('deleteOwned', () => {
    it("removes the owner's board", async () => {
      const board = await createBoard(ana, 'Roadmap');

      await boardsRepository.deleteOwned(ana, board.id);

      expect(await boardsRepository.findOwned(ana, board.id)).toBeNull();
    });

    it("leaves another owner's board untouched", async () => {
      const board = await createBoard(ana, 'Roadmap');

      await boardsRepository.deleteOwned(bruno, board.id);

      expect(await boardsRepository.findOwned(ana, board.id)).not.toBeNull();
    });
  });
});
