import type { TestingModule } from '@nestjs/testing';
import { DataSource, QueryFailedError } from 'typeorm';
import { UsersModule } from '../../../src/users/users.module';
import { bootWithDatabase } from '../../support/boot-with-database';

type Column = { column_name: string; data_type: string; is_nullable: string };

describe('users table', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([UsersModule]);
    dataSource = moduleRef.get(DataSource);
  });

  afterEach(async () => {
    if (await tableExists()) {
      await dataSource.query('DELETE FROM "users"');
    }
  });

  // Leave the shared database without this migration, as other suites
  // assert the exact migration history.
  afterAll(async () => {
    await dataSource.undoLastMigration();
    await moduleRef.close();
  });

  async function tableExists(): Promise<boolean> {
    const [row] = await dataSource.query<{ table: string | null }[]>(
      `SELECT to_regclass('public.users')::text AS "table"`,
    );
    return row.table === 'users';
  }

  function insertUser(email: string): Promise<unknown> {
    return dataSource.query(
      `INSERT INTO "users" ("name", "email", "password_hash") VALUES ('Ana', $1, 'hash')`,
      [email],
    );
  }

  it('is created by the migrations with the designed columns', async () => {
    const columns = await dataSource.query<Column[]>(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns
       WHERE table_name = 'users' ORDER BY column_name`,
    );

    expect(columns).toEqual([
      {
        column_name: 'created_at',
        data_type: 'timestamp with time zone',
        is_nullable: 'NO',
      },
      {
        column_name: 'email',
        data_type: 'character varying',
        is_nullable: 'NO',
      },
      { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
      {
        column_name: 'name',
        data_type: 'character varying',
        is_nullable: 'NO',
      },
      { column_name: 'password_hash', data_type: 'text', is_nullable: 'NO' },
    ]);
  });

  it('fills id and created_at by default', async () => {
    await insertUser('ana@example.com');

    const [row] = await dataSource.query<{ id: string; created_at: Date }[]>(
      `SELECT "id", "created_at" FROM "users" WHERE "email" = 'ana@example.com'`,
    );

    expect(row.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(row.created_at).toBeInstanceOf(Date);
  });

  it('rejects a second row with the same email on UQ_users_email', async () => {
    await insertUser('ana@example.com');

    const error = await insertUser('ana@example.com').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(QueryFailedError);
    expect((error as QueryFailedError).driverError).toMatchObject({
      code: '23505',
      constraint: 'UQ_users_email',
    });
  });

  it('is dropped when the migration is reverted', async () => {
    await dataSource.undoLastMigration();
    const dropped = !(await tableExists());
    await dataSource.runMigrations();

    expect(dropped).toBe(true);
    expect(await tableExists()).toBe(true);
  });
});
