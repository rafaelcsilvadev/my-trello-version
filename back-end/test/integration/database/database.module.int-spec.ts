import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource, type MigrationInterface, type QueryRunner } from 'typeorm';
import { validateEnv } from '../../../src/config/env.schema';
import {
  DatabaseModule,
  MIGRATIONS,
} from '../../../src/database/database.module';

class CreateProbeTable1700000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "probe" ("id" integer PRIMARY KEY)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "probe"');
  }
}

function bootDatabaseModule(databaseUrl: string): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        validate: () =>
          validateEnv({
            DATABASE_URL: databaseUrl,
            JWT_SECRET: process.env.JWT_SECRET,
          }),
      }),
      DatabaseModule,
    ],
  })
    .overrideProvider(MIGRATIONS)
    .useValue([CreateProbeTable1700000000000])
    .compile();
}

describe('DatabaseModule', () => {
  const databaseUrl = process.env.DATABASE_URL!;

  describe('with a reachable database', () => {
    let moduleRef: TestingModule;
    let dataSource: DataSource;

    beforeAll(async () => {
      moduleRef = await bootDatabaseModule(databaseUrl);
      dataSource = moduleRef.get(DataSource);
    });

    afterAll(async () => {
      await dataSource.undoLastMigration();
      await moduleRef.close();
    });

    it('applies pending migrations on boot', async () => {
      const history = await dataSource.query<{ name: string }[]>(
        'SELECT "name" FROM "migrations"',
      );
      const probe = await dataSource.query<{ table: string | null }[]>(
        `SELECT to_regclass('public.probe')::text AS "table"`,
      );

      expect(history.map((row) => row.name)).toEqual([
        'CreateProbeTable1700000000000',
      ]);
      expect(probe).toEqual([{ table: 'probe' }]);
    });
  });

  it('rejects init when DATABASE_URL points to an unusable database', async () => {
    const wrongPassword = new URL(databaseUrl);
    wrongPassword.password = 'wrong-password';

    await expect(bootDatabaseModule(wrongPassword.toString())).rejects.toThrow(
      /password authentication failed/,
    );
  });
});
