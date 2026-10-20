import type { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Card } from '../../../src/cards/card.entity';
import { CardsModule } from '../../../src/cards/cards.module';
import { CardsRepository } from '../../../src/cards/cards.repository';
import { bootWithDatabase } from '../../support/boot-with-database';
import { revertAllMigrations } from '../../support/revert-all-migrations';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type State = { position: number } | { archivedAt: string };

describe('CardsRepository', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let cardsRepository: CardsRepository;
  let ana: string;
  let bruno: string;
  let board: string;
  let otherBoard: string;
  let list: string;
  let otherList: string;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([CardsModule]);
    dataSource = moduleRef.get(DataSource);
    cardsRepository = moduleRef.get(CardsRepository);
  });

  beforeEach(async () => {
    ana = await insertUser('ana@example.com');
    bruno = await insertUser('bruno@example.com');
    board = await insertBoard(ana, 'Roadmap');
    otherBoard = await insertBoard(ana, 'Chores');
    list = await insertList(board, 'To do', { position: 0 });
    otherList = await insertList(board, 'Doing', { position: 1 });
  });

  afterEach(async () => {
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

  async function insertList(
    boardId: string,
    title: string,
    state: State,
  ): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "lists" ("board_id", "title", "position", "archived_at")
       VALUES ($1, $2, $3, $4) RETURNING "id"`,
      [
        boardId,
        title,
        'position' in state ? state.position : null,
        'archivedAt' in state ? state.archivedAt : null,
      ],
    );
    return row.id;
  }

  async function insertCard(
    listId: string,
    title: string,
    state: State,
  ): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "cards" ("list_id", "title", "position", "archived_at")
       VALUES ($1, $2, $3, $4) RETURNING "id"`,
      [
        listId,
        title,
        'position' in state ? state.position : null,
        'archivedAt' in state ? state.archivedAt : null,
      ],
    );
    return row.id;
  }

  async function positionsByTitle(
    listId: string,
  ): Promise<Record<string, number | null>> {
    const rows = await dataSource.query<
      { title: string; position: number | null }[]
    >(`SELECT "title", "position" FROM "cards" WHERE "list_id" = $1`, [listId]);
    return Object.fromEntries(rows.map((row) => [row.title, row.position]));
  }

  function titles(cards: Card[]): string[] {
    return cards.map((card) => card.title);
  }

  describe('create', () => {
    it('returns the stored card with generated id and dates, not done and not archived', async () => {
      const card = await cardsRepository.create({
        listId: list,
        title: 'Write spec',
        description: 'Cards feature',
        dueDate: '2026-11-01',
        position: 0,
      });

      expect(card).toMatchObject({
        listId: list,
        title: 'Write spec',
        description: 'Cards feature',
        dueDate: '2026-11-01',
        done: false,
        position: 0,
        archivedAt: null,
      });
      expect(card.id).toMatch(UUID);
      expect(card.createdAt).toBeInstanceOf(Date);
      expect(card.updatedAt).toBeInstanceOf(Date);
      expect(await cardsRepository.findOwned(ana, card.id)).toEqual(card);
    });
  });

  describe('findOwned', () => {
    it("returns the card for its board's owner", async () => {
      const id = await insertCard(list, 'Write spec', { position: 0 });

      expect(await cardsRepository.findOwned(ana, id)).toMatchObject({
        id,
        listId: list,
        title: 'Write spec',
        description: null,
        dueDate: null,
        done: false,
        position: 0,
        archivedAt: null,
      });
    });

    it('returns null when the board belongs to another owner', async () => {
      const id = await insertCard(list, 'Write spec', { position: 0 });

      expect(await cardsRepository.findOwned(bruno, id)).toBeNull();
    });

    it('returns null for an unknown id', async () => {
      expect(await cardsRepository.findOwned(ana, UNKNOWN_ID)).toBeNull();
    });
  });

  describe('findOwnedList', () => {
    it("returns the list for its board's owner", async () => {
      expect(await cardsRepository.findOwnedList(ana, list)).toMatchObject({
        id: list,
        boardId: board,
        title: 'To do',
        position: 0,
      });
    });

    it('returns null when the board belongs to another owner', async () => {
      expect(await cardsRepository.findOwnedList(bruno, list)).toBeNull();
    });

    it('returns null for an unknown id', async () => {
      expect(await cardsRepository.findOwnedList(ana, UNKNOWN_ID)).toBeNull();
    });
  });

  describe('findListInBoard', () => {
    it('returns the list of that board', async () => {
      expect(
        await cardsRepository.findListInBoard(board, otherList),
      ).toMatchObject({ id: otherList, boardId: board, title: 'Doing' });
    });

    it('returns null for a list of another board of the same owner', async () => {
      const foreign = await insertList(otherBoard, 'Foreign', { position: 0 });

      expect(await cardsRepository.findListInBoard(board, foreign)).toBeNull();
    });

    it("returns null for a list of another owner's board", async () => {
      const brunoBoard = await insertBoard(bruno, 'Bruno');
      const foreign = await insertList(brunoBoard, 'Foreign', { position: 0 });

      expect(await cardsRepository.findListInBoard(board, foreign)).toBeNull();
    });
  });

  describe('listInList', () => {
    it("returns only the list's active cards by position, ascending", async () => {
      await insertCard(list, 'C', { position: 2 });
      await insertCard(list, 'A', { position: 0 });
      await insertCard(list, 'B', { position: 1 });
      await insertCard(list, 'Archived', {
        archivedAt: '2026-01-01T00:00:00Z',
      });
      await insertCard(otherList, 'Foreign', { position: 3 });

      expect(titles(await cardsRepository.listInList(list, false))).toEqual([
        'A',
        'B',
        'C',
      ]);
    });

    it("returns only the list's archived cards, newest archivedAt first", async () => {
      await insertCard(list, 'Active', { position: 0 });
      await insertCard(list, 'Old', { archivedAt: '2026-01-01T00:00:00Z' });
      await insertCard(list, 'New', { archivedAt: '2026-03-01T00:00:00Z' });
      await insertCard(list, 'Middle', {
        archivedAt: '2026-02-01T00:00:00Z',
      });
      await insertCard(otherList, 'Foreign', {
        archivedAt: '2026-04-01T00:00:00Z',
      });

      expect(titles(await cardsRepository.listInList(list, true))).toEqual([
        'New',
        'Middle',
        'Old',
      ]);
    });

    it('breaks an archivedAt tie by id, descending', async () => {
      const sameTime = { archivedAt: '2026-01-01T00:00:00Z' };
      const ids = [
        await insertCard(list, 'A', sameTime),
        await insertCard(list, 'B', sameTime),
        await insertCard(list, 'C', sameTime),
      ];

      const listed = await cardsRepository.listInList(list, true);

      expect(listed.map((card) => card.id)).toEqual(ids.sort().reverse());
    });
  });

  describe('listInBoard', () => {
    it('returns active cards of active lists by list position, then card position', async () => {
      await insertCard(otherList, 'Doing B', { position: 1 });
      await insertCard(list, 'To do B', { position: 1 });
      await insertCard(otherList, 'Doing A', { position: 0 });
      await insertCard(list, 'To do A', { position: 0 });
      await insertCard(list, 'Archived', {
        archivedAt: '2026-01-01T00:00:00Z',
      });
      const archivedList = await insertList(board, 'Old', {
        archivedAt: '2026-01-01T00:00:00Z',
      });
      await insertCard(archivedList, 'In archived list', { position: 0 });
      const foreign = await insertList(otherBoard, 'Foreign', { position: 0 });
      await insertCard(foreign, 'Foreign', { position: 0 });

      expect(titles(await cardsRepository.listInBoard(board, false))).toEqual([
        'To do A',
        'To do B',
        'Doing A',
        'Doing B',
      ]);
    });

    it('returns archived cards of active and archived lists, newest archivedAt first', async () => {
      await insertCard(list, 'Active', { position: 0 });
      await insertCard(list, 'Old', { archivedAt: '2026-01-01T00:00:00Z' });
      const archivedList = await insertList(board, 'Archived list', {
        archivedAt: '2026-01-01T00:00:00Z',
      });
      await insertCard(archivedList, 'New', {
        archivedAt: '2026-03-01T00:00:00Z',
      });
      await insertCard(otherList, 'Middle', {
        archivedAt: '2026-02-01T00:00:00Z',
      });
      const foreign = await insertList(otherBoard, 'Foreign', { position: 0 });
      await insertCard(foreign, 'Foreign', {
        archivedAt: '2026-04-01T00:00:00Z',
      });

      expect(titles(await cardsRepository.listInBoard(board, true))).toEqual([
        'New',
        'Middle',
        'Old',
      ]);
    });

    it('breaks an archivedAt tie by id, descending', async () => {
      const sameTime = { archivedAt: '2026-01-01T00:00:00Z' };
      const ids = [
        await insertCard(list, 'A', sameTime),
        await insertCard(otherList, 'B', sameTime),
        await insertCard(list, 'C', sameTime),
      ];

      const listed = await cardsRepository.listInBoard(board, true);

      expect(listed.map((card) => card.id)).toEqual(ids.sort().reverse());
    });
  });

  describe('countActive', () => {
    it("counts only the list's active cards", async () => {
      await insertCard(list, 'A', { position: 0 });
      await insertCard(list, 'B', { position: 1 });
      await insertCard(list, 'Archived', {
        archivedAt: '2026-01-01T00:00:00Z',
      });
      await insertCard(otherList, 'Foreign', { position: 0 });

      expect(await cardsRepository.countActive(list)).toBe(2);
    });
  });

  describe('shift', () => {
    it('adds 1 to exactly the positions in [from, to] of that list', async () => {
      for (const [position, title] of ['A', 'B', 'C', 'D'].entries()) {
        await insertCard(list, title, { position });
        await insertCard(otherList, `other ${title}`, { position });
      }

      await cardsRepository.shift(list, 2, 3, 1);

      expect(await positionsByTitle(list)).toEqual({
        A: 0,
        B: 1,
        C: 3,
        D: 4,
      });
      expect(await positionsByTitle(otherList)).toEqual({
        'other A': 0,
        'other B': 1,
        'other C': 2,
        'other D': 3,
      });
    });

    it('subtracts 1 from exactly the positions in [from, to] of that list', async () => {
      await insertCard(list, 'A', { position: 0 });
      await insertCard(list, 'C', { position: 2 });
      await insertCard(list, 'D', { position: 3 });
      await insertCard(list, 'E', { position: 5 });
      await insertCard(otherList, 'other', { position: 2 });

      await cardsRepository.shift(list, 2, 3, -1);

      expect(await positionsByTitle(list)).toEqual({
        A: 0,
        C: 1,
        D: 2,
        E: 5,
      });
      expect(await positionsByTitle(otherList)).toEqual({ other: 2 });
    });

    it('keeps updatedAt of the shifted cards', async () => {
      const id = await insertCard(list, 'A', { position: 0 });
      const updatedAt = new Date('2026-01-01T00:00:00Z');
      await dataSource.query(
        `UPDATE "cards" SET "updated_at" = $2 WHERE "id" = $1`,
        [id, updatedAt],
      );

      await cardsRepository.shift(list, 0, 0, 1);

      expect(await cardsRepository.findOwned(ana, id)).toMatchObject({
        position: 1,
        updatedAt,
      });
    });
  });

  describe('save', () => {
    it('persists changed fields, list, position and archivedAt', async () => {
      const id = await insertCard(list, 'Write spec', { position: 0 });
      const card = (await cardsRepository.findOwned(ana, id))!;
      const archivedAt = new Date('2026-05-01T12:00:00Z');
      card.listId = otherList;
      card.title = 'Review spec';
      card.description = 'Second pass';
      card.dueDate = '2026-12-31';
      card.done = true;
      card.position = null;
      card.archivedAt = archivedAt;

      await cardsRepository.save(card);

      expect(await cardsRepository.findOwned(ana, id)).toMatchObject({
        listId: otherList,
        title: 'Review spec',
        description: 'Second pass',
        dueDate: '2026-12-31',
        done: true,
        position: null,
        archivedAt,
      });
    });
  });

  describe('delete', () => {
    it('removes only the given card', async () => {
      const id = await insertCard(list, 'Archived', {
        archivedAt: '2026-01-01T00:00:00Z',
      });
      const kept = await insertCard(list, 'A', { position: 0 });

      await cardsRepository.delete(id);

      expect(await cardsRepository.findOwned(ana, id)).toBeNull();
      expect(await cardsRepository.findOwned(ana, kept)).not.toBeNull();
    });
  });

  describe('lockOwnedBoard', () => {
    it('returns the board for its owner', async () => {
      const locked = await cardsRepository.transaction((cards) =>
        cards.lockOwnedBoard(ana, board),
      );

      expect(locked).toMatchObject({ id: board, ownerId: ana });
    });

    it('returns null when the board belongs to another owner', async () => {
      const locked = await cardsRepository.transaction((cards) =>
        cards.lockOwnedBoard(bruno, board),
      );

      expect(locked).toBeNull();
    });

    it('makes a second lock on the same board wait until the first commits', async () => {
      const events: string[] = [];
      let release!: () => void;
      const released = new Promise<void>((resolve) => (release = resolve));
      let firstLocked!: () => void;
      const locked = new Promise<void>((resolve) => (firstLocked = resolve));

      const first = cardsRepository.transaction(async (cards) => {
        await cards.lockOwnedBoard(ana, board);
        firstLocked();
        await released;
        events.push('first done');
      });
      await locked;
      const second = cardsRepository.transaction(async (cards) => {
        await cards.lockOwnedBoard(ana, board);
        events.push('second locked');
      });
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(events).toEqual([]);

      release();
      await Promise.all([first, second]);

      expect(events).toEqual(['first done', 'second locked']);
    });
  });

  describe('transaction', () => {
    it('rolls back every write when work throws', async () => {
      await insertCard(list, 'A', { position: 0 });
      const failure = new Error('boom');

      await expect(
        cardsRepository.transaction(async (cards) => {
          await cards.shift(list, 0, 0, 1);
          await cards.create({
            listId: list,
            title: 'B',
            description: null,
            dueDate: null,
            position: 0,
          });
          throw failure;
        }),
      ).rejects.toBe(failure);

      expect(await positionsByTitle(list)).toEqual({ A: 0 });
    });
  });
});
