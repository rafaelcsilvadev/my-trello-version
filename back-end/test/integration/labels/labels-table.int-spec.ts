import type { TestingModule } from '@nestjs/testing';
import { DataSource, QueryFailedError } from 'typeorm';
import { LABEL_COLORS } from '../../../src/labels/label-colors';
import { Label } from '../../../src/labels/label.entity';
import { LabelsModule } from '../../../src/labels/labels.module';
import { bootWithDatabase } from '../../support/boot-with-database';
import { revertAllMigrations } from '../../support/revert-all-migrations';

type Column = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  character_maximum_length: number | null;
  column_default: string | null;
};

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('labels and card_labels tables', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let boardId: string;
  let listId: string;
  let cardId: string;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([LabelsModule]);
    dataSource = moduleRef.get(DataSource);
  });

  beforeEach(async () => {
    boardId = await insertBoard(await insertUser('ana@example.com'));
    listId = await insertList(boardId, 0);
    cardId = await insertCard(listId, 0);
  });

  afterEach(async () => {
    if (await tableExists('card_labels')) {
      await dataSource.query('DELETE FROM "card_labels"');
    }
    if (await tableExists('labels')) {
      await dataSource.query('DELETE FROM "labels"');
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

  async function tableExists(table: string): Promise<boolean> {
    const [row] = await dataSource.query<{ table: string | null }[]>(
      `SELECT to_regclass($1)::text AS "table"`,
      [`public.${table}`],
    );
    return row.table === table;
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

  async function insertLabel(
    name = 'Bug',
    color = 'red',
    board: string = boardId,
  ): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "labels" ("board_id", "name", "color")
       VALUES ($1, $2, $3) RETURNING "id"`,
      [board, name, color],
    );
    return row.id;
  }

  function insertLink(card: string, label: string): Promise<unknown> {
    return dataSource.query(
      `INSERT INTO "card_labels" ("card_id", "label_id") VALUES ($1, $2)`,
      [card, label],
    );
  }

  async function links(): Promise<{ card_id: string; label_id: string }[]> {
    return dataSource.query(
      'SELECT "card_id", "label_id" FROM "card_labels" ORDER BY "card_id"',
    );
  }

  async function labelIds(): Promise<string[]> {
    const rows = await dataSource.query<{ id: string }[]>(
      'SELECT "id" FROM "labels"',
    );
    return rows.map((row) => row.id);
  }

  function expectViolation(error: unknown, code: string, constraint: string) {
    expect(error).toBeInstanceOf(QueryFailedError);
    expect((error as QueryFailedError).driverError).toMatchObject({
      code,
      constraint,
    });
  }

  it('creates both tables with the designed columns', async () => {
    const columns = await dataSource.query<Column[]>(
      `SELECT table_name, column_name, data_type, is_nullable,
              character_maximum_length, column_default
       FROM information_schema.columns
       WHERE table_name IN ('labels', 'card_labels')
       ORDER BY table_name, column_name`,
    );

    const timestamptz = 'timestamp with time zone';
    const uuid = (table_name: string, column_name: string) => ({
      table_name,
      column_name,
      data_type: 'uuid',
      is_nullable: 'NO',
      character_maximum_length: null,
      column_default: null,
    });
    expect(columns).toEqual([
      uuid('card_labels', 'card_id'),
      uuid('card_labels', 'label_id'),
      uuid('labels', 'board_id'),
      {
        table_name: 'labels',
        column_name: 'color',
        data_type: 'character varying',
        is_nullable: 'NO',
        character_maximum_length: 10,
        column_default: null,
      },
      {
        table_name: 'labels',
        column_name: 'created_at',
        data_type: timestamptz,
        is_nullable: 'NO',
        character_maximum_length: null,
        column_default: 'now()',
      },
      { ...uuid('labels', 'id'), column_default: 'gen_random_uuid()' },
      {
        table_name: 'labels',
        column_name: 'name',
        data_type: 'character varying',
        is_nullable: 'NO',
        character_maximum_length: 50,
        column_default: null,
      },
      {
        table_name: 'labels',
        column_name: 'updated_at',
        data_type: timestamptz,
        is_nullable: 'NO',
        character_maximum_length: null,
        column_default: 'now()',
      },
    ]);
  });

  it('indexes card_labels by label_id for the label delete cascade', async () => {
    const [index] = await dataSource.query<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes
       WHERE indexname = 'IDX_card_labels_label_id'`,
    );

    expect(index.indexdef).toContain(
      'ON public.card_labels USING btree (label_id)',
    );
  });

  it('maps the Label entity onto the table', async () => {
    const labels = dataSource.getRepository(Label);

    const saved = await labels.save(
      labels.create({ boardId, name: 'Bug', color: 'red' }),
    );
    const loaded = await labels.findOneByOrFail({ id: saved.id });

    expect(loaded).toEqual({
      id: saved.id,
      boardId,
      name: 'Bug',
      color: 'red',
      createdAt: expect.any(Date) as Date,
      updatedAt: expect.any(Date) as Date,
    });
  });

  it('accepts every color of the palette', async () => {
    for (const [index, color] of LABEL_COLORS.entries()) {
      await insertLabel(`Label ${index}`, color);
    }

    const [row] = await dataSource.query<{ count: number }[]>(
      'SELECT count(*)::int AS "count" FROM "labels"',
    );
    expect(row.count).toBe(LABEL_COLORS.length);
  });

  it.each(['Green', 'white', ''])(
    'rejects the color %j on CHK_labels_color',
    async (color) => {
      const error = await insertLabel('Bug', color).catch((e: unknown) => e);

      expectViolation(error, '23514', 'CHK_labels_color');
    },
  );

  it('rejects a label whose board does not exist on FK_labels_board_id', async () => {
    const error = await insertLabel('Bug', 'red', MISSING_ID).catch(
      (e: unknown) => e,
    );

    expectViolation(error, '23503', 'FK_labels_board_id');
  });

  it('rejects a name already used on the board ignoring case on UQ_labels_board_id_name', async () => {
    await insertLabel('Bug');

    const error = await insertLabel('bug', 'blue').catch((e: unknown) => e);

    expectViolation(error, '23505', 'UQ_labels_board_id_name');
  });

  it('allows the same name on two boards', async () => {
    const otherBoardId = await insertBoard(await insertUser('bia@example.com'));
    await insertLabel('Bug');

    await expect(
      insertLabel('Bug', 'red', otherBoardId),
    ).resolves.toBeDefined();
  });

  it('rejects linking the same label to a card twice on PK_card_labels', async () => {
    const labelId = await insertLabel();
    await insertLink(cardId, labelId);

    const error = await insertLink(cardId, labelId).catch((e: unknown) => e);

    expectViolation(error, '23505', 'PK_card_labels');
  });

  it.each([
    ['card', 'FK_card_labels_card_id'],
    ['label', 'FK_card_labels_label_id'],
  ])('rejects a link to a missing %s on %s', async (missing, constraint) => {
    const labelId = await insertLabel();

    const error = await (
      missing === 'card'
        ? insertLink(MISSING_ID, labelId)
        : insertLink(cardId, MISSING_ID)
    ).catch((e: unknown) => e);

    expectViolation(error, '23503', constraint);
  });

  it('deletes the links of a label when the label is deleted', async () => {
    const bugId = await insertLabel('Bug');
    const uxId = await insertLabel('UX', 'blue');
    await insertLink(cardId, bugId);
    await insertLink(cardId, uxId);

    await dataSource.query('DELETE FROM "labels" WHERE "id" = $1', [bugId]);

    expect(await links()).toEqual([{ card_id: cardId, label_id: uxId }]);
  });

  it('deletes the links of a card when the card is deleted', async () => {
    const otherCardId = await insertCard(listId, 1);
    const labelId = await insertLabel();
    await insertLink(cardId, labelId);
    await insertLink(otherCardId, labelId);

    await dataSource.query('DELETE FROM "cards" WHERE "id" = $1', [cardId]);

    expect(await links()).toEqual([
      { card_id: otherCardId, label_id: labelId },
    ]);
  });

  it("deletes the links of a list's cards when the list is deleted", async () => {
    const otherListId = await insertList(boardId, 1);
    const otherCardId = await insertCard(otherListId, 0);
    const labelId = await insertLabel();
    await insertLink(cardId, labelId);
    await insertLink(otherCardId, labelId);

    await dataSource.query('DELETE FROM "lists" WHERE "id" = $1', [listId]);

    expect(await links()).toEqual([
      { card_id: otherCardId, label_id: labelId },
    ]);
  });

  it('deletes the labels and every link of a board when the board is deleted', async () => {
    const otherBoardId = await insertBoard(await insertUser('bia@example.com'));
    const otherCardId = await insertCard(await insertList(otherBoardId, 0), 0);
    const labelId = await insertLabel();
    const otherLabelId = await insertLabel('Bug', 'red', otherBoardId);
    await insertLink(cardId, labelId);
    await insertLink(otherCardId, otherLabelId);

    await dataSource.query('DELETE FROM "boards" WHERE "id" = $1', [boardId]);

    expect(await labelIds()).toEqual([otherLabelId]);
    expect(await links()).toEqual([
      { card_id: otherCardId, label_id: otherLabelId },
    ]);
  });

  it('drops both tables when the migrations are reverted', async () => {
    await revertAllMigrations(dataSource);
    const dropped =
      !(await tableExists('labels')) && !(await tableExists('card_labels'));
    await dataSource.runMigrations();

    expect(dropped).toBe(true);
    expect(await tableExists('labels')).toBe(true);
    expect(await tableExists('card_labels')).toBe(true);
  });
});
