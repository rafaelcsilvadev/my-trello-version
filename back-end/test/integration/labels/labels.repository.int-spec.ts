import type { TestingModule } from '@nestjs/testing';
import { DataSource, QueryFailedError } from 'typeorm';
import { Label } from '../../../src/labels/label.entity';
import { LabelNameTakenError } from '../../../src/labels/labels.errors';
import { LabelsModule } from '../../../src/labels/labels.module';
import { LabelsRepository } from '../../../src/labels/labels.repository';
import { bootWithDatabase } from '../../support/boot-with-database';
import { revertAllMigrations } from '../../support/revert-all-migrations';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('LabelsRepository', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let labelsRepository: LabelsRepository;
  let ana: string;
  let bruno: string;
  let board: string;
  let otherBoard: string;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([LabelsModule]);
    dataSource = moduleRef.get(DataSource);
    labelsRepository = moduleRef.get(LabelsRepository);
  });

  beforeEach(async () => {
    ana = await insertUser('ana@example.com');
    bruno = await insertUser('bruno@example.com');
    board = await insertBoard(ana, 'Roadmap');
    otherBoard = await insertBoard(ana, 'Chores');
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "labels"');
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

  async function insertLabel(
    boardId: string,
    name: string,
    createdAt = new Date().toISOString(),
    id?: string,
  ): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "labels" ("id", "board_id", "name", "color", "created_at")
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, 'green', $4)
       RETURNING "id"`,
      [id ?? null, boardId, name, createdAt],
    );
    return row.id;
  }

  async function namesInBoard(boardId: string): Promise<string[]> {
    const rows = await dataSource.query<{ name: string }[]>(
      `SELECT "name" FROM "labels" WHERE "board_id" = $1 ORDER BY "name"`,
      [boardId],
    );
    return rows.map((row) => row.name);
  }

  function names(labels: Label[]): string[] {
    return labels.map((label) => label.name);
  }

  describe('findOwned', () => {
    it("returns the label for its board's owner", async () => {
      const id = await insertLabel(board, 'Bug');

      const label = await labelsRepository.findOwned(ana, id);

      expect(label).toMatchObject({
        id,
        boardId: board,
        name: 'Bug',
        color: 'green',
      });
    });

    it('returns null when the board belongs to another owner', async () => {
      const id = await insertLabel(board, 'Bug');

      expect(await labelsRepository.findOwned(bruno, id)).toBeNull();
    });

    it('returns null for an unknown id', async () => {
      expect(await labelsRepository.findOwned(ana, UNKNOWN_ID)).toBeNull();
    });
  });

  describe('listInBoard', () => {
    it("returns only the board's labels by createdAt, ascending", async () => {
      await insertLabel(board, 'Chore', '2026-10-03T00:00:00Z');
      await insertLabel(board, 'Bug', '2026-10-01T00:00:00Z');
      await insertLabel(board, 'Idea', '2026-10-02T00:00:00Z');
      await insertLabel(otherBoard, 'Errand', '2026-09-01T00:00:00Z');

      const labels = await labelsRepository.listInBoard(board);

      expect(names(labels)).toEqual(['Bug', 'Idea', 'Chore']);
    });

    it('breaks a createdAt tie by id, ascending', async () => {
      const sameTime = '2026-10-01T00:00:00Z';
      await insertLabel(
        board,
        'Second',
        sameTime,
        'ffffffff-ffff-4fff-8fff-ffffffffffff',
      );
      await insertLabel(
        board,
        'First',
        sameTime,
        '11111111-1111-4111-8111-111111111111',
      );

      const labels = await labelsRepository.listInBoard(board);

      expect(names(labels)).toEqual(['First', 'Second']);
    });

    it('returns [] for a board with no labels', async () => {
      await insertLabel(otherBoard, 'Errand');

      expect(await labelsRepository.listInBoard(board)).toEqual([]);
    });
  });

  describe('create', () => {
    it('returns the stored label with generated id and dates', async () => {
      const label = await labelsRepository.create({
        boardId: board,
        name: 'Bug',
        color: 'red',
      });

      expect(label).toMatchObject({
        boardId: board,
        name: 'Bug',
        color: 'red',
      });
      expect(label.id).toMatch(UUID);
      expect(label.createdAt).toBeInstanceOf(Date);
      expect(label.updatedAt).toBeInstanceOf(Date);
      expect(await namesInBoard(board)).toEqual(['Bug']);
    });

    it('throws LabelNameTakenError on a name of the same board in another case', async () => {
      await insertLabel(board, 'Bug');

      await expect(
        labelsRepository.create({ boardId: board, name: 'bUG', color: 'red' }),
      ).rejects.toBeInstanceOf(LabelNameTakenError);
      expect(await namesInBoard(board)).toEqual(['Bug']);
    });

    it('accepts a name already used on another board', async () => {
      await insertLabel(otherBoard, 'Bug');

      const label = await labelsRepository.create({
        boardId: board,
        name: 'Bug',
        color: 'red',
      });

      expect(label).toMatchObject({ boardId: board, name: 'Bug' });
    });

    it('rethrows any other database error unchanged', async () => {
      const error: unknown = await labelsRepository
        .create({ boardId: UNKNOWN_ID, name: 'Bug', color: 'red' })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(QueryFailedError);
      expect((error as QueryFailedError).driverError).toMatchObject({
        code: '23503',
        constraint: 'FK_labels_board_id',
      });
    });
  });

  describe('save', () => {
    it('persists the changed fields', async () => {
      const label = (await labelsRepository.findOwned(
        ana,
        await insertLabel(board, 'Bug'),
      ))!;
      label.name = 'Defect';
      label.color = 'orange';

      await labelsRepository.save(label);

      expect(await labelsRepository.findOwned(ana, label.id)).toMatchObject({
        name: 'Defect',
        color: 'orange',
      });
    });

    it('accepts the label own name in another case', async () => {
      const label = (await labelsRepository.findOwned(
        ana,
        await insertLabel(board, 'Bug'),
      ))!;
      label.name = 'BUG';

      const saved = await labelsRepository.save(label);

      expect(saved.name).toBe('BUG');
      expect(await namesInBoard(board)).toEqual(['BUG']);
    });

    it('throws LabelNameTakenError on the name of another label of the board in another case', async () => {
      await insertLabel(board, 'Bug');
      const label = (await labelsRepository.findOwned(
        ana,
        await insertLabel(board, 'Idea'),
      ))!;
      label.name = 'bug';

      await expect(labelsRepository.save(label)).rejects.toBeInstanceOf(
        LabelNameTakenError,
      );
      expect(await namesInBoard(board)).toEqual(['Bug', 'Idea']);
    });

    it('rethrows any other database error unchanged', async () => {
      const label = (await labelsRepository.findOwned(
        ana,
        await insertLabel(board, 'Bug'),
      ))!;
      label.color = 'Green' as Label['color'];

      const error: unknown = await labelsRepository
        .save(label)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(QueryFailedError);
      expect((error as QueryFailedError).driverError).toMatchObject({
        code: '23514',
        constraint: 'CHK_labels_color',
      });
    });
  });

  describe('delete', () => {
    it('removes only that label', async () => {
      const id = await insertLabel(board, 'Bug');
      await insertLabel(board, 'Idea');

      await labelsRepository.delete(id);

      expect(await namesInBoard(board)).toEqual(['Idea']);
    });
  });

  describe('lockOwnedBoard', () => {
    it('returns the board for its owner', async () => {
      const locked = await labelsRepository.transaction((labels) =>
        labels.lockOwnedBoard(ana, board),
      );

      expect(locked).toMatchObject({ id: board, ownerId: ana });
    });

    it('returns null when the board belongs to another owner', async () => {
      const locked = await labelsRepository.transaction((labels) =>
        labels.lockOwnedBoard(bruno, board),
      );

      expect(locked).toBeNull();
    });
  });

  describe('transaction', () => {
    it('rolls back every write when work throws', async () => {
      const id = await insertLabel(board, 'Bug');
      const failure = new Error('boom');

      await expect(
        labelsRepository.transaction(async (labels) => {
          await labels.delete(id);
          await labels.create({ boardId: board, name: 'Idea', color: 'red' });
          throw failure;
        }),
      ).rejects.toBe(failure);

      expect(await namesInBoard(board)).toEqual(['Bug']);
    });
  });
});
