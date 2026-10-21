import type { TestingModule } from '@nestjs/testing';
import { DataSource, QueryFailedError } from 'typeorm';
import { ChecklistItem } from '../../../src/checklists/checklist-item.entity';
import { ChecklistsModule } from '../../../src/checklists/checklists.module';
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

describe('checklist_items table', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let boardId: string;
  let listId: string;
  let cardId: string;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([ChecklistsModule]);
    dataSource = moduleRef.get(DataSource);
  });

  beforeEach(async () => {
    boardId = await insertBoard(await insertUser('ana@example.com'));
    listId = await insertList(boardId, 0);
    cardId = await insertCard(listId, 0);
  });

  afterEach(async () => {
    if (await tableExists()) {
      await dataSource.query('DELETE FROM "checklist_items"');
    }
    await dataSource.query('DELETE FROM "cards"');
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
      `SELECT to_regclass('public.checklist_items')::text AS "table"`,
    );
    return row.table === 'checklist_items';
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

  async function insertCard(list: string, position: number): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "cards" ("list_id", "title", "position")
       VALUES ($1, 'Write spec', $2) RETURNING "id"`,
      [list, position],
    );
    return row.id;
  }

  function insertItem(
    position: number,
    text = 'Draft',
    runner: Runner = dataSource,
    card: string = cardId,
  ): Promise<unknown> {
    return runner.query(
      `INSERT INTO "checklist_items" ("card_id", "text", "position")
       VALUES ($1, $2, $3)`,
      [card, text, position],
    );
  }

  async function itemCardIds(): Promise<string[]> {
    const rows = await dataSource.query<{ card_id: string }[]>(
      'SELECT "card_id" FROM "checklist_items"',
    );
    return rows.map((row) => row.card_id);
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

  function expectViolation(error: unknown, code: string, constraint?: string) {
    expect(error).toBeInstanceOf(QueryFailedError);
    expect((error as QueryFailedError).driverError).toMatchObject(
      constraint === undefined ? { code } : { code, constraint },
    );
  }

  it('is created by the migrations with the designed columns', async () => {
    const columns = await dataSource.query<Column[]>(
      `SELECT column_name, data_type, is_nullable, character_maximum_length,
              column_default
       FROM information_schema.columns
       WHERE table_name = 'checklist_items' ORDER BY column_name`,
    );

    const timestamptz = 'timestamp with time zone';
    expect(columns).toEqual([
      {
        column_name: 'card_id',
        data_type: 'uuid',
        is_nullable: 'NO',
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
        column_name: 'done',
        data_type: 'boolean',
        is_nullable: 'NO',
        character_maximum_length: null,
        column_default: 'false',
      },
      {
        column_name: 'id',
        data_type: 'uuid',
        is_nullable: 'NO',
        character_maximum_length: null,
        column_default: 'gen_random_uuid()',
      },
      {
        column_name: 'position',
        data_type: 'integer',
        is_nullable: 'NO',
        character_maximum_length: null,
        column_default: null,
      },
      {
        column_name: 'text',
        data_type: 'character varying',
        is_nullable: 'NO',
        character_maximum_length: 200,
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

  it('maps the ChecklistItem entity onto the table with defaults', async () => {
    const items = dataSource.getRepository(ChecklistItem);

    const saved = await items.save(
      items.create({ cardId, text: 'Draft', position: 0 }),
    );
    const loaded = await items.findOneByOrFail({ id: saved.id });

    expect(loaded).toEqual({
      id: saved.id,
      cardId,
      text: 'Draft',
      done: false,
      position: 0,
      createdAt: expect.any(Date) as Date,
      updatedAt: expect.any(Date) as Date,
    });
    expect(loaded.updatedAt).toEqual(loaded.createdAt);
  });

  it('rejects an item whose card does not exist on FK_checklist_items_card_id', async () => {
    const error = await insertItem(
      0,
      'Draft',
      dataSource,
      '00000000-0000-4000-8000-000000000000',
    ).catch((e: unknown) => e);

    expectViolation(error, '23503', 'FK_checklist_items_card_id');
  });

  it('rejects a text longer than 200 characters', async () => {
    const error = await insertItem(0, 'a'.repeat(201)).catch((e: unknown) => e);

    // 22001: string_data_right_truncation, raised by varchar(200).
    expectViolation(error, '22001');
  });

  it('accepts a text of exactly 200 characters', async () => {
    await insertItem(0, 'a'.repeat(200));

    expect(await itemCardIds()).toEqual([cardId]);
  });

  it('rejects a negative position on CHK_checklist_items_position', async () => {
    const error = await insertItem(-1).catch((e: unknown) => e);

    expectViolation(error, '23514', 'CHK_checklist_items_position');
  });

  it('rejects two items at the same position of a card on COMMIT', async () => {
    const error = await inTransaction(async (runner) => {
      await insertItem(0, 'Draft', runner);
      await insertItem(0, 'Review', runner);
    });

    expectViolation(error, '23505', 'UQ_checklist_items_card_id_position');
    expect(await itemCardIds()).toEqual([]);
  });

  it('allows the same position on different cards', async () => {
    const otherCardId = await insertCard(listId, 1);
    await insertItem(0);
    await insertItem(0, 'Draft', dataSource, otherCardId);

    expect((await itemCardIds()).sort()).toEqual([cardId, otherCardId].sort());
  });

  it('commits a swap of two positions inside one transaction', async () => {
    await insertItem(0, 'Draft');
    await insertItem(1, 'Review');

    // Each UPDATE collides row by row; only the deferred check lets the swap
    // commit.
    const error = await inTransaction(async (runner) => {
      await runner.query(
        `UPDATE "checklist_items" SET "position" = 1 WHERE "text" = 'Draft'`,
      );
      await runner.query(
        `UPDATE "checklist_items" SET "position" = 0 WHERE "text" = 'Review'`,
      );
    });

    expect(error).toBeUndefined();
    const rows = await dataSource.query<{ text: string }[]>(
      'SELECT "text" FROM "checklist_items" ORDER BY "position"',
    );
    expect(rows).toEqual([{ text: 'Review' }, { text: 'Draft' }]);
  });

  it("deletes the card's items when the card is deleted", async () => {
    const otherCardId = await insertCard(listId, 1);
    await insertItem(0);
    await insertItem(1);
    await insertItem(0, 'Draft', dataSource, otherCardId);

    await dataSource.query('DELETE FROM "cards" WHERE "id" = $1', [cardId]);

    expect(await itemCardIds()).toEqual([otherCardId]);
  });

  it('deletes the items of the cards of a list when the list is deleted', async () => {
    const otherListId = await insertList(boardId, 1);
    const otherCardId = await insertCard(otherListId, 0);
    await insertItem(0);
    await insertItem(0, 'Draft', dataSource, otherCardId);

    await dataSource.query('DELETE FROM "lists" WHERE "id" = $1', [listId]);

    expect(await itemCardIds()).toEqual([otherCardId]);
  });

  it('deletes the items of the cards of a board when the board is deleted', async () => {
    const secondCardId = await insertCard(await insertList(boardId, 1), 0);
    const otherBoardId = await insertBoard(await insertUser('bia@example.com'));
    const otherCardId = await insertCard(await insertList(otherBoardId, 0), 0);
    await insertItem(0);
    await insertItem(0, 'Draft', dataSource, secondCardId);
    await insertItem(0, 'Draft', dataSource, otherCardId);

    await dataSource.query('DELETE FROM "boards" WHERE "id" = $1', [boardId]);

    expect(await itemCardIds()).toEqual([otherCardId]);
  });

  it('is dropped when the migrations are reverted', async () => {
    await revertAllMigrations(dataSource);
    const dropped = !(await tableExists());
    await dataSource.runMigrations();

    expect(dropped).toBe(true);
    expect(await tableExists()).toBe(true);
  });
});
