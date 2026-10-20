import type { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { lockOwnedBoard } from '../../../src/boards/board-lock';
import { BoardsModule } from '../../../src/boards/boards.module';
import { bootWithDatabase } from '../../support/boot-with-database';
import { revertAllMigrations } from '../../support/revert-all-migrations';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('lockOwnedBoard', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let ana: string;
  let bruno: string;
  let board: string;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([BoardsModule]);
    dataSource = moduleRef.get(DataSource);
  });

  beforeEach(async () => {
    ana = await insertUser('ana@example.com');
    bruno = await insertUser('bruno@example.com');
    board = await insertBoard(ana, 'Roadmap');
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "boards"');
    await dataSource.query('DELETE FROM "users"');
  });

  // Leave the shared database without migrations, as other suites assert the
  // exact migration history.
  afterAll(async () => {
    await revertAllMigrations(dataSource);
    await moduleRef.close();
  });

  async function insertUser(email: string): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "users" ("name", "email", "password_hash")
       VALUES ('User', $1, 'hash') RETURNING "id"`,
      [email],
    );
    return row.id;
  }

  async function insertBoard(ownerId: string, title: string): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "boards" ("owner_id", "title") VALUES ($1, $2)
       RETURNING "id"`,
      [ownerId, title],
    );
    return row.id;
  }

  it('returns the board for its owner', async () => {
    const locked = await dataSource.transaction((manager) =>
      lockOwnedBoard(manager, ana, board),
    );

    expect(locked).toMatchObject({ id: board, ownerId: ana, title: 'Roadmap' });
  });

  it('returns null when the board belongs to another owner', async () => {
    const locked = await dataSource.transaction((manager) =>
      lockOwnedBoard(manager, bruno, board),
    );

    expect(locked).toBeNull();
  });

  it('returns null for an unknown id', async () => {
    const locked = await dataSource.transaction((manager) =>
      lockOwnedBoard(manager, ana, UNKNOWN_ID),
    );

    expect(locked).toBeNull();
  });

  it('makes a second lock on the same board wait until the first commits', async () => {
    const events: string[] = [];
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    let firstLocked!: () => void;
    const locked = new Promise<void>((resolve) => (firstLocked = resolve));

    const first = dataSource.transaction(async (manager) => {
      await lockOwnedBoard(manager, ana, board);
      firstLocked();
      await released;
      events.push('first done');
    });
    await locked;
    const second = dataSource.transaction(async (manager) => {
      await lockOwnedBoard(manager, ana, board);
      events.push('second locked');
    });
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(events).toEqual([]);

    release();
    await Promise.all([first, second]);

    expect(events).toEqual(['first done', 'second locked']);
  });
});
