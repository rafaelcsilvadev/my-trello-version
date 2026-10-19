import type { TestingModule } from '@nestjs/testing';
import { DataSource, QueryFailedError } from 'typeorm';
import { Board } from '../../../src/boards/board.entity';
import { BoardsModule } from '../../../src/boards/boards.module';
import { bootWithDatabase } from '../../support/boot-with-database';
import { revertAllMigrations } from '../../support/revert-all-migrations';

type Column = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  character_maximum_length: number | null;
  has_default: boolean;
};

describe('boards table', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([BoardsModule]);
    dataSource = moduleRef.get(DataSource);
  });

  afterEach(async () => {
    if (await tableExists()) {
      await dataSource.query('DELETE FROM "boards"');
    }
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
      `SELECT to_regclass('public.boards')::text AS "table"`,
    );
    return row.table === 'boards';
  }

  async function insertUser(email: string): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "users" ("name", "email", "password_hash")
       VALUES ('Ana', $1, 'hash') RETURNING "id"`,
      [email],
    );
    return row.id;
  }

  function insertBoard(ownerId: string): Promise<unknown> {
    return dataSource.query(
      `INSERT INTO "boards" ("owner_id", "title") VALUES ($1, 'Roadmap')`,
      [ownerId],
    );
  }

  it('is created by the migrations with the designed columns', async () => {
    const columns = await dataSource.query<Column[]>(
      `SELECT column_name, data_type, is_nullable, character_maximum_length,
              column_default IS NOT NULL AS has_default
       FROM information_schema.columns
       WHERE table_name = 'boards' ORDER BY column_name`,
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
        column_name: 'created_at',
        data_type: timestamptz,
        is_nullable: 'NO',
        character_maximum_length: null,
        has_default: true,
      },
      {
        column_name: 'description',
        data_type: 'character varying',
        is_nullable: 'YES',
        character_maximum_length: 1000,
        has_default: false,
      },
      {
        column_name: 'id',
        data_type: 'uuid',
        is_nullable: 'NO',
        character_maximum_length: null,
        has_default: true,
      },
      {
        column_name: 'owner_id',
        data_type: 'uuid',
        is_nullable: 'NO',
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

  it('maps the Board entity onto the table', async () => {
    const ownerId = await insertUser('ana@example.com');
    const boards = dataSource.getRepository(Board);

    const saved = await boards.save(
      boards.create({ ownerId, title: 'Roadmap', description: null }),
    );
    const loaded = await boards.findOneByOrFail({ id: saved.id });

    expect(loaded).toEqual({
      id: saved.id,
      ownerId,
      title: 'Roadmap',
      description: null,
      archivedAt: null,
      createdAt: expect.any(Date) as Date,
      updatedAt: expect.any(Date) as Date,
    });
  });

  it('rejects a board whose owner does not exist on FK_boards_owner_id', async () => {
    const error = await insertBoard(
      '00000000-0000-4000-8000-000000000000',
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(QueryFailedError);
    expect((error as QueryFailedError).driverError).toMatchObject({
      code: '23503',
      constraint: 'FK_boards_owner_id',
    });
  });

  it("deletes the owner's boards when the owner is deleted", async () => {
    const ownerId = await insertUser('ana@example.com');
    const otherId = await insertUser('bia@example.com');
    await insertBoard(ownerId);
    await insertBoard(otherId);

    await dataSource.query('DELETE FROM "users" WHERE "id" = $1', [ownerId]);

    const owners = await dataSource.query<{ owner_id: string }[]>(
      'SELECT "owner_id" FROM "boards"',
    );
    expect(owners).toEqual([{ owner_id: otherId }]);
  });

  it('has the owner and newest-first index', async () => {
    const [row] = await dataSource.query<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes
       WHERE tablename = 'boards' AND indexname = 'IDX_boards_owner_id_created_at'`,
    );

    expect(row?.indexdef).toContain('(owner_id, created_at DESC)');
  });

  it('is dropped when the migrations are reverted', async () => {
    await revertAllMigrations(dataSource);
    const dropped = !(await tableExists());
    await dataSource.runMigrations();

    expect(dropped).toBe(true);
    expect(await tableExists()).toBe(true);
  });
});
