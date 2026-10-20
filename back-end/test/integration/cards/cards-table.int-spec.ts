import type { TestingModule } from '@nestjs/testing';
import { DataSource, QueryFailedError } from 'typeorm';
import { Card } from '../../../src/cards/card.entity';
import { CardsModule } from '../../../src/cards/cards.module';
import { bootWithDatabase } from '../../support/boot-with-database';
import { revertAllMigrations } from '../../support/revert-all-migrations';

type Column = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  character_maximum_length: number | null;
  column_default: string | null;
};

type Runner = { query: DataSource['query'] };

describe('cards table', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let ownerId: string;
  let boardId: string;
  let listId: string;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([CardsModule]);
    dataSource = moduleRef.get(DataSource);
  });

  beforeEach(async () => {
    ownerId = await insertUser('ana@example.com');
    boardId = await insertBoard(ownerId);
    listId = await insertList(boardId, 0);
  });

  afterEach(async () => {
    if (await tableExists()) {
      await dataSource.query('DELETE FROM "cards"');
    }
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

  async function tableExists(): Promise<boolean> {
    const [row] = await dataSource.query<{ table: string | null }[]>(
      `SELECT to_regclass('public.cards')::text AS "table"`,
    );
    return row.table === 'cards';
  }

  async function insertUser(email: string): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "users" ("name", "email", "password_hash")
       VALUES ('Ana', $1, 'hash') RETURNING "id"`,
      [email],
    );
    return row.id;
  }

  async function insertBoard(owner: string): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "boards" ("owner_id", "title") VALUES ($1, 'Roadmap')
       RETURNING "id"`,
      [owner],
    );
    return row.id;
  }

  async function insertList(board: string, position: number): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "lists" ("board_id", "title", "position")
       VALUES ($1, 'To do', $2) RETURNING "id"`,
      [board, position],
    );
    return row.id;
  }

  function insertCard(
    position: number | null,
    archivedAt: Date | null = null,
    runner: Runner = dataSource,
    list: string = listId,
  ): Promise<unknown> {
    return runner.query(
      `INSERT INTO "cards" ("list_id", "title", "position", "archived_at")
       VALUES ($1, 'Write spec', $2, $3)`,
      [list, position, archivedAt],
    );
  }

  async function cardListIds(): Promise<string[]> {
    const rows = await dataSource.query<{ list_id: string }[]>(
      'SELECT "list_id" FROM "cards"',
    );
    return rows.map((row) => row.list_id);
  }

  // Runs work in one transaction and returns the error raised by the work or
  // by COMMIT, if any.
  async function inTransaction(
    work: (runner: Runner) => Promise<unknown>,
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
              column_default
       FROM information_schema.columns
       WHERE table_name = 'cards' ORDER BY column_name`,
    );

    const timestamptz = 'timestamp with time zone';
    expect(columns).toEqual([
      {
        column_name: 'archived_at',
        data_type: timestamptz,
        is_nullable: 'YES',
        character_maximum_length: null,
        column_default: null,
      },
      {
        column_name: 'created_at',
        data_type: timestamptz,
        is_nullable: 'NO',
        character_maximum_length: null,
        column_default: 'now()',
      },
      {
        column_name: 'description',
        data_type: 'character varying',
        is_nullable: 'YES',
        character_maximum_length: 5000,
        column_default: null,
      },
      {
        column_name: 'done',
        data_type: 'boolean',
        is_nullable: 'NO',
        character_maximum_length: null,
        column_default: 'false',
      },
      {
        column_name: 'due_date',
        data_type: 'date',
        is_nullable: 'YES',
        character_maximum_length: null,
        column_default: null,
      },
      {
        column_name: 'id',
        data_type: 'uuid',
        is_nullable: 'NO',
        character_maximum_length: null,
        column_default: 'gen_random_uuid()',
      },
      {
        column_name: 'list_id',
        data_type: 'uuid',
        is_nullable: 'NO',
        character_maximum_length: null,
        column_default: null,
      },
      {
        column_name: 'position',
        data_type: 'integer',
        is_nullable: 'YES',
        character_maximum_length: null,
        column_default: null,
      },
      {
        column_name: 'title',
        data_type: 'character varying',
        is_nullable: 'NO',
        character_maximum_length: 100,
        column_default: null,
      },
      {
        column_name: 'updated_at',
        data_type: timestamptz,
        is_nullable: 'NO',
        character_maximum_length: null,
        column_default: 'now()',
      },
    ]);
  });

  it('maps the Card entity onto the table with done defaulting to false', async () => {
    const cards = dataSource.getRepository(Card);

    const saved = await cards.save(
      cards.create({
        listId,
        title: 'Write spec',
        description: null,
        dueDate: null,
        position: 0,
        archivedAt: null,
      }),
    );
    const loaded = await cards.findOneByOrFail({ id: saved.id });

    expect(loaded).toEqual({
      id: saved.id,
      listId,
      title: 'Write spec',
      description: null,
      dueDate: null,
      done: false,
      position: 0,
      archivedAt: null,
      createdAt: expect.any(Date) as Date,
      updatedAt: expect.any(Date) as Date,
    });
  });

  it('reads back a due date saved through the entity as the same string', async () => {
    const cards = dataSource.getRepository(Card);

    const saved = await cards.save(
      cards.create({
        listId,
        title: 'Write spec',
        description: 'notes',
        dueDate: '2026-11-01',
        position: 0,
        archivedAt: null,
      }),
    );
    const loaded = await cards.findOneByOrFail({ id: saved.id });

    expect(loaded.dueDate).toBe('2026-11-01');
    expect(loaded.description).toBe('notes');
  });

  it('rejects a card whose list does not exist on FK_cards_list_id', async () => {
    const error = await insertCard(
      0,
      null,
      dataSource,
      '00000000-0000-4000-8000-000000000000',
    ).catch((e: unknown) => e);

    expectViolation(error, '23503', 'FK_cards_list_id');
  });

  it("deletes the list's active and archived cards when the list is deleted", async () => {
    const otherListId = await insertList(boardId, 1);
    await insertCard(0);
    await insertCard(null, new Date());
    await insertCard(0, null, dataSource, otherListId);

    await dataSource.query('DELETE FROM "lists" WHERE "id" = $1', [listId]);

    expect(await cardListIds()).toEqual([otherListId]);
  });

  it('deletes the cards of every list of a board when the board is deleted', async () => {
    const secondListId = await insertList(boardId, 1);
    const otherBoardId = await insertBoard(await insertUser('bia@example.com'));
    const otherListId = await insertList(otherBoardId, 0);
    await insertCard(0);
    await insertCard(0, null, dataSource, secondListId);
    await insertCard(null, new Date(), dataSource, secondListId);
    await insertCard(0, null, dataSource, otherListId);

    await dataSource.query('DELETE FROM "boards" WHERE "id" = $1', [boardId]);

    expect(await cardListIds()).toEqual([otherListId]);
  });

  it('rejects two active cards at the same position of a list on COMMIT', async () => {
    const error = await inTransaction(async (runner) => {
      await insertCard(0, null, runner);
      await insertCard(0, null, runner);
    });

    expectViolation(error, '23505', 'UQ_cards_list_id_position');
    expect(await dataSource.query('SELECT 1 FROM "cards"')).toEqual([]);
  });

  it('allows a duplicate position that is fixed before COMMIT', async () => {
    await insertCard(0);
    await insertCard(1);

    // Shifting 0 and 1 by +1 collides row by row; only the deferred check
    // lets the new card take position 0 in the same transaction.
    const error = await inTransaction(async (runner) => {
      await runner.query(
        `UPDATE "cards" SET "position" = "position" + 1 WHERE "list_id" = $1`,
        [listId],
      );
      await insertCard(0, null, runner);
    });

    expect(error).toBeUndefined();
    const positions = await dataSource.query<{ position: number }[]>(
      'SELECT "position" FROM "cards" ORDER BY "position"',
    );
    expect(positions).toEqual([
      { position: 0 },
      { position: 1 },
      { position: 2 },
    ]);
  });

  it('allows several archived cards without a position', async () => {
    await insertCard(null, new Date());
    await insertCard(null, new Date());

    const [row] = await dataSource.query<{ count: number }[]>(
      'SELECT count(*)::int AS "count" FROM "cards" WHERE "position" IS NULL',
    );
    expect(row.count).toBe(2);
  });

  it.each([
    ['an active card without a position', null, null],
    ['an archived card with a position', 0, new Date()],
    ['an active card with a negative position', -1, null],
    ['an archived card with a negative position', -1, new Date()],
  ])(
    'rejects %s on CHK_cards_position_archived',
    async (_, position, archivedAt) => {
      const error = await insertCard(position, archivedAt).catch(
        (e: unknown) => e,
      );

      expectViolation(error, '23514', 'CHK_cards_position_archived');
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
