import { PasswordHasher } from '../../../src/auth/password-hasher';
import dataSource from '../../../src/database/data-source';
import { DEMO_BOARDS, DEMO_USER } from '../../../src/seed/demo-data';
import { seedDemo } from '../../../src/seed/seed-demo';
import { revertAllMigrations } from '../../support/revert-all-migrations';

const TODAY = new Date('2026-10-21T15:00:00Z');

describe('seedDemo', () => {
  const hasher = new PasswordHasher();

  // The CLI's DataSource, which loads every entity, unlike a Nest module
  // that registers only its own.
  beforeAll(async () => {
    await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  // Leave the shared database without migrations, as other suites assert the
  // exact migration history.
  afterAll(async () => {
    await revertAllMigrations(dataSource);
    await dataSource.destroy();
  });

  async function demoUser(): Promise<{
    id: string;
    name: string;
    password_hash: string;
  }> {
    const rows = await dataSource.query<
      { id: string; name: string; password_hash: string }[]
    >(`SELECT "id", "name", "password_hash" FROM "users" WHERE "email" = $1`, [
      DEMO_USER.email,
    ]);
    expect(rows).toHaveLength(1);
    return rows[0];
  }

  it('creates the demo user with a password that verifies', async () => {
    await seedDemo(dataSource, hasher, TODAY);

    const user = await demoUser();
    expect(user.name).toBe(DEMO_USER.name);
    await expect(
      hasher.verify(DEMO_USER.password, user.password_hash),
    ).resolves.toBe(true);
  });

  it('creates every demo board, archived ones with archived_at set', async () => {
    await seedDemo(dataSource, hasher, TODAY);

    const user = await demoUser();
    const boards = await dataSource.query<
      { title: string; description: string | null; archived: boolean }[]
    >(
      `SELECT "title", "description", "archived_at" IS NOT NULL AS "archived"
       FROM "boards" WHERE "owner_id" = $1 ORDER BY "title"`,
      [user.id],
    );
    expect(boards).toEqual(
      DEMO_BOARDS.map((board) => ({
        title: board.title,
        description: board.description ?? null,
        archived: board.archived ?? false,
      })).sort((a, b) => a.title.localeCompare(b.title)),
    );
  });

  it('places active lists and cards at contiguous positions, archived ones at NULL', async () => {
    await seedDemo(dataSource, hasher, TODAY);

    for (const board of DEMO_BOARDS) {
      const lists = await dataSource.query<
        { id: string; title: string; position: number | null }[]
      >(
        `SELECT l."id", l."title", l."position" FROM "lists" l
         JOIN "boards" b ON b."id" = l."board_id"
         WHERE b."title" = $1 ORDER BY l."position"`,
        [board.title],
      );
      expect(lists.map((list) => [list.title, list.position])).toEqual(
        board.lists.map((list, index) => [list.title, index]),
      );

      for (const [index, list] of board.lists.entries()) {
        const cards = await dataSource.query<
          { title: string; position: number | null; archived: boolean }[]
        >(
          `SELECT "title", "position", "archived_at" IS NOT NULL AS "archived"
           FROM "cards" WHERE "list_id" = $1
           ORDER BY "position" NULLS LAST, "title"`,
          [lists[index].id],
        );
        const active = list.cards.filter((card) => !card.archived);
        const archived = list.cards
          .filter((card) => card.archived)
          .sort((a, b) => a.title.localeCompare(b.title));
        expect(cards).toEqual([
          ...active.map((card, position) => ({
            title: card.title,
            position,
            archived: false,
          })),
          ...archived.map((card) => ({
            title: card.title,
            position: null,
            archived: true,
          })),
        ]);
      }
    }
  });

  it('stores card details, with due dates counted from the seed day', async () => {
    await seedDemo(dataSource, hasher, TODAY);

    const cards = await dataSource.query<
      {
        title: string;
        description: string | null;
        due_date: string | null;
        done: boolean;
      }[]
    >(
      `SELECT "title", "description", to_char("due_date", 'YYYY-MM-DD') AS "due_date", "done"
       FROM "cards" ORDER BY "title"`,
    );
    const expected = DEMO_BOARDS.flatMap((board) =>
      board.lists.flatMap((list) => list.cards),
    ).map((card) => ({
      title: card.title,
      description: card.description ?? null,
      due_date:
        card.dueInDays === undefined
          ? null
          : addDays('2026-10-21', card.dueInDays),
      done: card.done ?? false,
    }));
    expect(cards).toEqual(
      expected.sort((a, b) => a.title.localeCompare(b.title)),
    );
    // The demo shows an overdue, a due-today and an upcoming card.
    expect(cards.map((card) => card.due_date)).toEqual(
      expect.arrayContaining(['2026-10-20', '2026-10-21', '2026-10-24']),
    );
  });

  it('creates each board labels and links them only to cards of that board', async () => {
    await seedDemo(dataSource, hasher, TODAY);

    for (const board of DEMO_BOARDS) {
      const labels = await dataSource.query<{ name: string; color: string }[]>(
        `SELECT lb."name", lb."color" FROM "labels" lb
         JOIN "boards" b ON b."id" = lb."board_id"
         WHERE b."title" = $1 ORDER BY lb."name"`,
        [board.title],
      );
      expect(labels).toEqual(
        [...board.labels].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }

    const links = await dataSource.query<
      { card: string; label: string; same_board: boolean }[]
    >(
      `SELECT c."title" AS "card", lb."name" AS "label",
              l."board_id" = lb."board_id" AS "same_board"
       FROM "card_labels" cl
       JOIN "cards" c ON c."id" = cl."card_id"
       JOIN "lists" l ON l."id" = c."list_id"
       JOIN "labels" lb ON lb."id" = cl."label_id"
       ORDER BY c."title", lb."name"`,
    );
    const expected = DEMO_BOARDS.flatMap((board) =>
      board.lists.flatMap((list) => list.cards),
    )
      .flatMap((card) =>
        (card.labels ?? []).map((label) => ({
          card: card.title,
          label,
          same_board: true,
        })),
      )
      .sort(
        (a, b) =>
          a.card.localeCompare(b.card) || a.label.localeCompare(b.label),
      );
    expect(expected.length).toBeGreaterThan(0);
    expect(links).toEqual(expected);
  });

  it('creates checklist items at contiguous positions', async () => {
    await seedDemo(dataSource, hasher, TODAY);

    const items = await dataSource.query<
      { card: string; text: string; done: boolean; position: number }[]
    >(
      `SELECT c."title" AS "card", i."text", i."done", i."position"
       FROM "checklist_items" i JOIN "cards" c ON c."id" = i."card_id"
       ORDER BY c."title", i."position"`,
    );
    const expected = DEMO_BOARDS.flatMap((board) =>
      board.lists.flatMap((list) => list.cards),
    )
      .sort((a, b) => a.title.localeCompare(b.title))
      .flatMap((card) =>
        (card.checklist ?? []).map((item, position) => ({
          card: card.title,
          text: item.text,
          done: item.done ?? false,
          position,
        })),
      );
    expect(expected.length).toBeGreaterThan(0);
    expect(items).toEqual(expected);
  });
});

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
