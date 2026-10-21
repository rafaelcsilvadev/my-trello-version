import type { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ChecklistItem } from '../../../src/checklists/checklist-item.entity';
import { ChecklistItemsRepository } from '../../../src/checklists/checklist-items.repository';
import { ChecklistsModule } from '../../../src/checklists/checklists.module';
import { bootWithDatabase } from '../../support/boot-with-database';
import { revertAllMigrations } from '../../support/revert-all-migrations';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('ChecklistItemsRepository', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let itemsRepository: ChecklistItemsRepository;
  let ana: string;
  let bruno: string;
  let card: string;
  let otherCard: string;

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([ChecklistsModule]);
    dataSource = moduleRef.get(DataSource);
    itemsRepository = moduleRef.get(ChecklistItemsRepository);
  });

  beforeEach(async () => {
    ana = await insertUser('ana@example.com');
    bruno = await insertUser('bruno@example.com');
    const list = await insertList(await insertBoard(ana));
    card = await insertCard(list, 0);
    otherCard = await insertCard(list, 1);
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "checklist_items"');
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

  async function insertBoard(ownerId: string): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "boards" ("owner_id", "title") VALUES ($1, 'Roadmap')
       RETURNING "id"`,
      [ownerId],
    );
    return row.id;
  }

  async function insertList(boardId: string): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "lists" ("board_id", "title", "position")
       VALUES ($1, 'To do', 0) RETURNING "id"`,
      [boardId],
    );
    return row.id;
  }

  async function insertCard(listId: string, position: number): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "cards" ("list_id", "title", "position")
       VALUES ($1, 'Card', $2) RETURNING "id"`,
      [listId, position],
    );
    return row.id;
  }

  async function insertItem(
    cardId: string,
    text: string,
    position: number,
  ): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "checklist_items" ("card_id", "text", "position")
       VALUES ($1, $2, $3) RETURNING "id"`,
      [cardId, text, position],
    );
    return row.id;
  }

  async function positionsByText(
    cardId: string,
  ): Promise<Record<string, number>> {
    const rows = await dataSource.query<{ text: string; position: number }[]>(
      `SELECT "text", "position" FROM "checklist_items" WHERE "card_id" = $1`,
      [cardId],
    );
    return Object.fromEntries(rows.map((row) => [row.text, row.position]));
  }

  function texts(items: ChecklistItem[]): string[] {
    return items.map((item) => item.text);
  }

  describe('create', () => {
    it('returns the stored item with generated id and dates, not done', async () => {
      const item = await itemsRepository.create({
        cardId: card,
        text: 'Write tests',
        position: 0,
      });

      expect(item).toMatchObject({
        cardId: card,
        text: 'Write tests',
        done: false,
        position: 0,
      });
      expect(item.id).toMatch(UUID);
      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.updatedAt).toBeInstanceOf(Date);
      expect(await itemsRepository.findOwned(ana, item.id)).toEqual(item);
    });
  });

  describe('findOwned', () => {
    it("returns the item for its board's owner", async () => {
      const id = await insertItem(card, 'Write tests', 0);

      expect(await itemsRepository.findOwned(ana, id)).toMatchObject({
        id,
        cardId: card,
        text: 'Write tests',
        done: false,
        position: 0,
      });
    });

    it('returns null when the board belongs to another owner', async () => {
      const id = await insertItem(card, 'Write tests', 0);

      expect(await itemsRepository.findOwned(bruno, id)).toBeNull();
    });

    it('returns null for an unknown id', async () => {
      expect(await itemsRepository.findOwned(ana, UNKNOWN_ID)).toBeNull();
    });
  });

  describe('findInCard', () => {
    it('returns the item of that card', async () => {
      const id = await insertItem(card, 'Write tests', 0);

      expect(await itemsRepository.findInCard(card, id)).toMatchObject({
        id,
        cardId: card,
      });
    });

    it('returns null for an item of another card', async () => {
      const id = await insertItem(otherCard, 'Write tests', 0);

      expect(await itemsRepository.findInCard(card, id)).toBeNull();
    });
  });

  describe('listInCard', () => {
    it("returns only the card's items by position, ascending", async () => {
      await insertItem(card, 'C', 2);
      await insertItem(card, 'A', 0);
      await insertItem(otherCard, 'other', 1);
      await insertItem(card, 'B', 1);

      expect(texts(await itemsRepository.listInCard(card))).toEqual([
        'A',
        'B',
        'C',
      ]);
    });
  });

  describe('countInCard', () => {
    it("counts only the card's items", async () => {
      await insertItem(card, 'A', 0);
      await insertItem(card, 'B', 1);
      await insertItem(otherCard, 'other', 0);

      expect(await itemsRepository.countInCard(card)).toBe(2);
    });
  });

  describe('shift', () => {
    it('adds 1 to exactly the positions in [from, to] of that card', async () => {
      for (const [position, text] of ['A', 'B', 'C', 'D'].entries()) {
        await insertItem(card, text, position);
        await insertItem(otherCard, `other ${text}`, position);
      }

      await itemsRepository.shift(card, 2, 3, 1);

      expect(await positionsByText(card)).toEqual({ A: 0, B: 1, C: 3, D: 4 });
      expect(await positionsByText(otherCard)).toEqual({
        'other A': 0,
        'other B': 1,
        'other C': 2,
        'other D': 3,
      });
    });

    it('subtracts 1 from exactly the positions in [from, to] of that card', async () => {
      await insertItem(card, 'A', 0);
      await insertItem(card, 'C', 2);
      await insertItem(card, 'D', 3);
      await insertItem(card, 'E', 5);
      await insertItem(otherCard, 'other', 2);

      await itemsRepository.shift(card, 2, 3, -1);

      expect(await positionsByText(card)).toEqual({ A: 0, C: 1, D: 2, E: 5 });
      expect(await positionsByText(otherCard)).toEqual({ other: 2 });
    });

    it('keeps updatedAt of the shifted items', async () => {
      const id = await insertItem(card, 'A', 0);
      const updatedAt = new Date('2026-01-01T00:00:00Z');
      await dataSource.query(
        `UPDATE "checklist_items" SET "updated_at" = $2 WHERE "id" = $1`,
        [id, updatedAt],
      );

      await itemsRepository.shift(card, 0, 0, 1);

      expect(await itemsRepository.findOwned(ana, id)).toMatchObject({
        position: 1,
        updatedAt,
      });
    });
  });

  describe('save', () => {
    it('persists changed text, done and position', async () => {
      const id = await insertItem(card, 'Write tests', 0);
      const item = (await itemsRepository.findOwned(ana, id))!;
      item.text = 'Ship it';
      item.done = true;
      item.position = 3;

      await itemsRepository.save(item);

      expect(await itemsRepository.findOwned(ana, id)).toMatchObject({
        text: 'Ship it',
        done: true,
        position: 3,
      });
    });
  });

  describe('delete', () => {
    it('removes only the given item', async () => {
      const id = await insertItem(card, 'A', 0);
      const kept = await insertItem(card, 'B', 1);

      await itemsRepository.delete(id);

      expect(await itemsRepository.findOwned(ana, id)).toBeNull();
      expect(await itemsRepository.findOwned(ana, kept)).not.toBeNull();
    });
  });

  describe('bound', () => {
    it('writes through the given manager, so they roll back with its transaction', async () => {
      await insertItem(card, 'A', 0);
      const failure = new Error('boom');

      await expect(
        dataSource.transaction(async (manager) => {
          const items = ChecklistItemsRepository.bound(manager);
          await items.shift(card, 0, 0, 1);
          await items.create({ cardId: card, text: 'B', position: 0 });
          expect(await items.countInCard(card)).toBe(2);
          throw failure;
        }),
      ).rejects.toBe(failure);

      expect(await positionsByText(card)).toEqual({ A: 0 });
    });
  });
});
