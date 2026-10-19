import type { DataSource } from 'typeorm';

// Reverts every executed migration, newest first, so the shared database is
// left empty no matter how many migrations exist.
export async function revertAllMigrations(
  dataSource: DataSource,
): Promise<void> {
  while (await hasExecutedMigrations(dataSource)) {
    await dataSource.undoLastMigration();
  }
}

async function hasExecutedMigrations(dataSource: DataSource): Promise<boolean> {
  const [row] = await dataSource.query<{ count: number }[]>(
    'SELECT count(*)::int AS "count" FROM "migrations"',
  );
  return row.count > 0;
}
