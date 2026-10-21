import { PasswordHasher } from '../../../src/auth/password-hasher';
import dataSource from '../../../src/database/data-source';
import { DEMO_USER } from '../../../src/seed/demo-data';
import { runSeed } from '../../../src/seed/seed';
import { revertAllMigrations } from '../../support/revert-all-migrations';

describe('runSeed', () => {
  // Leave the shared database without migrations, as other suites assert the
  // exact migration history.
  afterEach(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    await revertAllMigrations(dataSource);
    await dataSource.destroy();
  });

  it('runs the migrations on an empty database, then seeds the demo user', async () => {
    await runSeed(dataSource, new PasswordHasher());

    expect(dataSource.isInitialized).toBe(false);
    await dataSource.initialize();
    const users = await dataSource.query<{ email: string }[]>(
      'SELECT "email" FROM "users"',
    );
    expect(users).toEqual([{ email: DEMO_USER.email }]);
  });

  it('closes the connection when seeding fails', async () => {
    const failingHasher = {
      hash: () => Promise.reject(new Error('hash failed')),
    } as unknown as PasswordHasher;

    await expect(runSeed(dataSource, failingHasher)).rejects.toThrow(
      'hash failed',
    );
    expect(dataSource.isInitialized).toBe(false);
  });
});
