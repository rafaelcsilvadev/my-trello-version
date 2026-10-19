import type { TestingModule } from '@nestjs/testing';
import { DataSource, QueryFailedError } from 'typeorm';
import { List } from '../../../src/lists/list.entity';
import { ListsModule } from '../../../src/lists/lists.module';
import { bootWithDatabase } from '../../support/boot-with-database';
import { revertAllMigrations } from '../../support/revert-all-migrations';

type Column = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  character_maximum_length: number | null;
  has_default: boolean;
};

describe('lists table', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let boardId: string;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([ListsModule]);
    dataSource = moduleRef.get(DataSource);
  });

  beforeEach(async () => {
    const ownerId = await insertUser('ana@example.com');
    boardId = await insertBoard(ownerId);
  });

  afterEach(async () => {
    if (await tableExists()) {
      await dataSource.query('DELETE FROM "lists"');
    }
    await dataSource.query('DELETE FROM "boards"');
    await dataSource.query('DELETE FROM "users"');
  });

  // Leave the shared database without migrations, as other suites assert the
  // exact migration history.
  afterAll(async () => {
    await revertAllMigrations(dataSource);
    await moduleRef.close();
  });

  async function tableExists(): Promise<boolean> {
    const [row] = await dataSource.query<{ table: string | null }[]>(
      `SELECT to_regclass('public.lists')::text AS "table"`,
    );
    return row.table === 'lists';
  }

  async function insertUser(email: string): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "users" ("name", "email", "password_hash")
       VALUES ('Ana', $1, 'hash') RETURNING "id"`,
      [email],
    );
    return row.id;
  }

  async function insertBoard(ownerId: string): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "boards" ("owner_id", "title") VALUES ($1, 'Roadmap')
       RETURNING "id"`,
      [ownerId],
    );
    return row.id;
  }

  function insertList(
    position: number | null,
    archivedAt: Date | null = null,
    runner: { query: DataSource['query'] } = dataSource,
  ): Promise<unknown> {
    return runner.query(
      `INSERT INTO "lists" ("board_id", "title", "position", "archived_at")
       VALUES ($1, 'To do', $2, $3)`,
      [boardId, position, archivedAt],
    );
  }

  // Runs work in one transaction and returns the error raised by the work or
  // by COMMIT, if any.
  async function inTransaction(
    work: (runner: { query: DataSource['query'] }) => Promise<unknown>,
  ): Promise<unknown> {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await work(runner);
      await runner.commitTransaction();
      return undefined;
    } catch (error) {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction();
      }
      return error;
    } finally {
      await runner.release();
    }
  }

  function expectViolation(error: unknown, code: string, constraint: string) {
    expect(error).toBeInstanceOf(QueryFailedError);
    expect((error as QueryFailedError).driverError).toMatchObject({
      code,
      constraint,
    });
  }

  it('is created by the migrations with the designed columns', async () => {
    const columns = await dataSource.query<Column[]>(
      `SELECT column_name, data_type, is_nullable, character_maximum_length,
              column_default IS NOT NULL AS has_default
       FROM information_schema.columns
       WHERE table_name = 'lists' ORDER BY column_name`,
    );

    const timestamptz = 'timestamp with time zone';
    expect(columns).toEqual([
      {
        column_name: 'archived_at',
        data_type: timestamptz,
        is_nullable: 'YES',
        character_maximum_length: null,
        has_default: false,
      },
      {
        column_name: 'board_id',
        data_type: 'uuid',
        is_nullable: 'NO',
        character_maximum_length: null,
        has_default: false,
      },
      {
        column_name: 'created_at',
        data_type: timestamptz,
        is_nullable: 'NO',
        character_maximum_length: null,
        has_default: true,
      },
      {
        column_name: 'id',
        data_type: 'uuid',
        is_nullable: 'NO',
        character_maximum_length: null,
        has_default: true,
      },
      {
        column_name: 'position',
        data_type: 'integer',
        is_nullable: 'YES',
        character_maximum_length: null,
        has_default: false,
      },
      {
        column_name: 'title',
        data_type: 'character varying',
        is_nullable: 'NO',
        character_maximum_length: 100,
        has_default: false,
      },
      {
        column_name: 'updated_at',
        data_type: timestamptz,
        is_nullable: 'NO',
        character_maximum_length: null,
        has_default: true,
      },
    ]);
  });

  it('maps the List entity onto the table', async () => {
    const lists = dataSource.getRepository(List);

    const saved = await lists.save(
      lists.create({ boardId, title: 'To do', position: 0, archivedAt: null }),
    );
    const loaded = await lists.findOneByOrFail({ id: saved.id });

    expect(loaded).toEqual({
      id: saved.id,
      boardId,
      title: 'To do',
      position: 0,
      archivedAt: null,
      createdAt: expect.any(Date) as Date,
      updatedAt: expect.any(Date) as Date,
    });
  });

  it('rejects a list whose board does not exist on FK_lists_board_id', async () => {
    boardId = '00000000-0000-4000-8000-000000000000';

    const error = await insertList(0).catch((e: unknown) => e);

    expectViolation(error, '23503', 'FK_lists_board_id');
  });

  it("deletes the board's lists when the board is deleted", async () => {
    const otherBoardId = await insertBoard(await insertUser('bia@example.com'));
    await insertList(0);
    await insertList(null, new Date());
    const deletedBoardId = boardId;
    boardId = otherBoardId;
    await insertList(0);

    await dataSource.query('DELETE FROM "boards" WHERE "id" = $1', [
      deletedBoardId,
    ]);

    const boards = await dataSource.query<{ board_id: string }[]>(
      'SELECT "board_id" FROM "lists"',
    );
    expect(boards).toEqual([{ board_id: otherBoardId }]);
  });

  it('rejects two active lists at the same position on COMMIT', async () => {
    const error = await inTransaction(async (runner) => {
      await insertList(0, null, runner);
      await insertList(0, null, runner);
    });

    expectViolation(error, '23505', 'UQ_lists_board_id_position');
    expect(await dataSource.query('SELECT 1 FROM "lists"')).toEqual([]);
  });

  it('allows a duplicate position that is fixed before COMMIT', async () => {
    await insertList(0);
    await insertList(1);

    // Shifting 0 and 1 by +1 collides row by row; only the deferred check
    // lets the new list take position 0 in the same transaction.
    const error = await inTransaction(async (runner) => {
      await runner.query(
        `UPDATE "lists" SET "position" = "position" + 1 WHERE "board_id" = $1`,
        [boardId],
      );
      await insertList(0, null, runner);
    });

    expect(error).toBeUndefined();
    const positions = await dataSource.query<{ position: number }[]>(
      'SELECT "position" FROM "lists" ORDER BY "position"',
    );
    expect(positions).toEqual([
      { position: 0 },
      { position: 1 },
      { position: 2 },
    ]);
  });

  it('allows several archived lists without a position', async () => {
    await insertList(null, new Date());
    await insertList(null, new Date());

    const [row] = await dataSource.query<{ count: number }[]>(
      'SELECT count(*)::int AS "count" FROM "lists" WHERE "position" IS NULL',
    );
    expect(row.count).toBe(2);
  });

  it.each([
    ['an active list without a position', null, null],
    ['an archived list with a position', 0, new Date()],
    ['an active list with a negative position', -1, null],
    ['an archived list with a negative position', -1, new Date()],
  ])(
    'rejects %s on CHK_lists_position_archived',
    async (_, position, archivedAt) => {
      const error = await insertList(position, archivedAt).catch(
        (e: unknown) => e,
      );

      expectViolation(error, '23514', 'CHK_lists_position_archived');
    },
  );

  it('is dropped when the migrations are reverted', async () => {
    await revertAllMigrations(dataSource);
    const dropped = !(await tableExists());
    await dataSource.runMigrations();

    expect(dropped).toBe(true);
    expect(await tableExists()).toBe(true);
  });
});
