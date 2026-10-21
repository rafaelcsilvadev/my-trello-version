import type { DataSource } from 'typeorm';
import { PasswordHasher } from '../auth/password-hasher';
import { DEMO_USER } from './demo-data';
import { seedDemo } from './seed-demo';

// Applies pending migrations, so the seed also works before the API ever
// started, then resets the demo account.
export async function runSeed(
  dataSource: DataSource,
  hasher: PasswordHasher,
): Promise<void> {
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    await seedDemo(dataSource, hasher);
  } finally {
    await dataSource.destroy();
  }
}

// Usage: pnpm run seed (or node dist/seed/seed.js inside the API container).
// Needs the same environment as the API (DATABASE_URL, JWT_SECRET).
if (require.main === module) {
  // Loaded here, not imported, because it validates the environment on load.
  const { default: dataSource } =
    require('../database/data-source') as typeof import('../database/data-source');
  runSeed(dataSource, new PasswordHasher()).then(
    () => {
      console.log(
        `Demo data ready. Log in as ${DEMO_USER.email} / ${DEMO_USER.password}`,
      );
    },
    (error: unknown) => {
      console.error(error);
      process.exit(1);
    },
  );
}
