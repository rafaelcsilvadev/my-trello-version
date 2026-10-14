import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { startPostgres } from './start-postgres';

declare global {
  var postgresContainer: StartedPostgreSqlContainer | undefined;
}

// Jest workers are spawned after global setup, so they inherit DATABASE_URL.
export default async function globalSetup(): Promise<void> {
  const container = await startPostgres();
  globalThis.postgresContainer = container;
  process.env.DATABASE_URL = container.getConnectionUri();
}
