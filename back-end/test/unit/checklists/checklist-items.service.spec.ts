import type { EntityManager } from 'typeorm';
import { BoardArchivedError } from '../../../src/boards/boards.errors';
import type { Card } from '../../../src/cards/card.entity';
import {
  CardArchivedError,
  CardNotFoundError,
} from '../../../src/cards/cards.errors';
import type { CardsService } from '../../../src/cards/cards.service';
import type { ChecklistItem } from '../../../src/checklists/checklist-item.entity';
import { ChecklistItemsRepository } from '../../../src/checklists/checklist-items.repository';
import { ChecklistItemsService } from '../../../src/checklists/checklist-items.service';
import { ChecklistItemNotFoundError } from '../../../src/checklists/checklists.errors';
import { ListArchivedError } from '../../../src/lists/lists.errors';

const OWNER_ID = '7f3c2a8e-1b4d-4c6e-9a0f-2d5b8c1e7a90';
const CARD_ID = 'c4a8e2f6-9b3d-4e1a-8c7f-2b6d0e4a9c51';
const ITEM_ID = 'a9e3c7b1-5d2f-4a8e-b6c0-3f1d9e5b7a24';
const MANAGER = {} as EntityManager;

type ItemsRepositoryMock = jest.Mocked<
  Pick<
    ChecklistItemsRepository,
    | 'findOwned'
    | 'findInCard'
    | 'listInCard'
    | 'countInCard'
    | 'create'
    | 'shift'
    | 'save'
    | 'delete'
  >
>;

type CardsServiceMock = jest.Mocked<
  Pick<CardsService, 'writeActiveCard' | 'findOwnedCard'>
>;

function buildCard(overrides: Partial<Card> = {}): Card {
  return {
    id: CARD_ID,
    listId: 'e1b5d9f3-7c4a-4b2e-9d8f-6a0c4e2b8d17',
    title: 'Ship it',
    description: null,
    dueDate: null,
    done: false,
    position: 0,
    archivedAt: null,
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
    ...overrides,
  };
}

function buildItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: ITEM_ID,
    cardId: CARD_ID,
    text: 'Write tests',
    done: false,
    position: 0,
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
    ...overrides,
  };
}

describe('ChecklistItemsService', () => {
  // items serves the owner-scoped lookup; bound stands for the instance
  // built on the card write's transaction manager.
  let items: ItemsRepositoryMock;
  let bound: ItemsRepositoryMock;
  let boundSpy: jest.SpyInstance;
  let cards: CardsServiceMock;
  let service: ChecklistItemsService;

  function buildRepositoryMock(): ItemsRepositoryMock {
    return {
      findOwned: jest.fn(),
      findInCard: jest.fn(),
      listInCard: jest.fn(),
      countInCard: jest.fn(),
      create: jest.fn(),
      shift: jest.fn(),
      save: jest.fn((item: ChecklistItem) => Promise.resolve(item)),
      delete: jest.fn(),
    };
  }

  function expectNoWrites(): void {
    expect(bound.create).not.toHaveBeenCalled();
    expect(bound.shift).not.toHaveBeenCalled();
    expect(bound.save).not.toHaveBeenCalled();
    expect(bound.delete).not.toHaveBeenCalled();
  }

  // The lookup before the lock and the re-read under it answer the same item
  // unless a test says otherwise.
  function givenItem(item: ChecklistItem, count = 1): void {
    items.findOwned.mockResolvedValue(item);
    bound.findInCard.mockResolvedValue(item);
    bound.countInCard.mockResolvedValue(count);
  }

  beforeEach(() => {
    items = buildRepositoryMock();
    bound = buildRepositoryMock();
    boundSpy = jest
      .spyOn(ChecklistItemsRepository, 'bound')
      .mockReturnValue(bound as unknown as ChecklistItemsRepository);
    // Mirrors writeActiveCard: before under the lock, then work.
    cards = {
      writeActiveCard: jest.fn(async (_ownerId, _cardId, work, before) => {
        const card = buildCard();
        await before?.(card, MANAGER);
        return work(card, MANAGER);
      }),
      findOwnedCard: jest.fn(),
    };
    service = new ChecklistItemsService(
      items as unknown as ChecklistItemsRepository,
      cards as unknown as CardsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('appends the item at the end of the card through the card write', async () => {
      const created = buildItem({ position: 3 });
      bound.countInCard.mockResolvedValue(3);
      bound.create.mockResolvedValue(created);

      const result = await service.create(OWNER_ID, CARD_ID, 'Write tests');

      expect(cards.writeActiveCard).toHaveBeenCalledWith(
        OWNER_ID,
        CARD_ID,
        expect.any(Function),
      );
      expect(boundSpy).toHaveBeenCalledWith(MANAGER);
      expect(bound.countInCard).toHaveBeenCalledWith(CARD_ID);
      expect(bound.create).toHaveBeenCalledWith({
        cardId: CARD_ID,
        text: 'Write tests',
        position: 3,
      });
      expect(result).toBe(created);
    });

    it.each([
      ['card not found', new CardNotFoundError()],
      ['board archived', new BoardArchivedError()],
      ['card archived', new CardArchivedError()],
    ])(
      'propagates %s from the card write without creating',
      async (_case, error) => {
        cards.writeActiveCard.mockRejectedValue(error);

        await expect(
          service.create(OWNER_ID, CARD_ID, 'Write tests'),
        ).rejects.toBe(error);
        expectNoWrites();
      },
    );
  });

  describe('listInCard', () => {
    it('checks the card then lists its items', async () => {
      const listed = [buildItem(), buildItem({ position: 1 })];
      cards.findOwnedCard.mockResolvedValue(buildCard());
      items.listInCard.mockResolvedValue(listed);

      const result = await service.listInCard(OWNER_ID, CARD_ID);

      expect(cards.findOwnedCard).toHaveBeenCalledWith(OWNER_ID, CARD_ID);
      expect(items.listInCard).toHaveBeenCalledWith(CARD_ID);
      expect(cards.writeActiveCard).not.toHaveBeenCalled();
      expect(result).toBe(listed);
    });

    it('propagates card not found without listing', async () => {
      cards.findOwnedCard.mockRejectedValue(new CardNotFoundError());

      await expect(service.listInCard(OWNER_ID, CARD_ID)).rejects.toThrow(
        CardNotFoundError,
      );
      expect(items.listInCard).not.toHaveBeenCalled();
    });
  });

  // update, move and remove share the item write flow.
  describe.each([
    ['update', (id: string) => service.update(OWNER_ID, id, { done: true })],
    ['move', (id: string) => service.move(OWNER_ID, id, 0)],
    ['remove', (id: string) => service.remove(OWNER_ID, id)],
  ])('%s item write flow', (_name, write) => {
    it('rejects a malformed id without any lookup', async () => {
      await expect(write('not-a-uuid')).rejects.toThrow(
        ChecklistItemNotFoundError,
      );
      expect(items.findOwned).not.toHaveBeenCalled();
      expect(cards.writeActiveCard).not.toHaveBeenCalled();
    });

    it('rejects an unknown or foreign id without the card write', async () => {
      items.findOwned.mockResolvedValue(null);

      await expect(write(ITEM_ID)).rejects.toThrow(ChecklistItemNotFoundError);
      expect(items.findOwned).toHaveBeenCalledWith(OWNER_ID, ITEM_ID);
      expect(cards.writeActiveCard).not.toHaveBeenCalled();
    });

    it("writes through the item's card with a re-read hook", async () => {
      givenItem(buildItem({ position: 1 }), 2);

      await write(ITEM_ID);

      expect(cards.writeActiveCard).toHaveBeenCalledWith(
        OWNER_ID,
        CARD_ID,
        expect.any(Function),
        expect.any(Function),
      );
      expect(bound.findInCard).toHaveBeenCalledWith(CARD_ID, ITEM_ID);
    });

    it('rejects an item deleted before the lock', async () => {
      items.findOwned.mockResolvedValue(buildItem());
      bound.findInCard.mockResolvedValue(null);

      await expect(write(ITEM_ID)).rejects.toThrow(ChecklistItemNotFoundError);
      expectNoWrites();
    });

    it('answers item not found when its card was deleted', async () => {
      items.findOwned.mockResolvedValue(buildItem());
      cards.writeActiveCard.mockRejectedValue(new CardNotFoundError());

      await expect(write(ITEM_ID)).rejects.toThrow(ChecklistItemNotFoundError);
    });

    it.each([
      ['board archived', new BoardArchivedError()],
      ['list archived', new ListArchivedError()],
      ['card archived', new CardArchivedError()],
    ])('propagates %s unchanged', async (_case, error) => {
      items.findOwned.mockResolvedValue(buildItem());
      cards.writeActiveCard.mockRejectedValue(error);

      await expect(write(ITEM_ID)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('returns the item untouched on an empty change set', async () => {
      const item = buildItem();
      givenItem(item);

      const result = await service.update(OWNER_ID, ITEM_ID, {});

      expect(result).toBe(item);
      expect(bound.save).not.toHaveBeenCalled();
    });

    it('ignores undefined fields', async () => {
      givenItem(buildItem());

      await service.update(OWNER_ID, ITEM_ID, { text: undefined });

      expect(bound.save).not.toHaveBeenCalled();
    });

    it('assigns the given fields and saves', async () => {
      givenItem(buildItem());

      const result = await service.update(OWNER_ID, ITEM_ID, {
        text: 'Write more tests',
        done: true,
      });

      expect(bound.save).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Write more tests', done: true }),
      );
      expect(result).toMatchObject({ text: 'Write more tests', done: true });
    });

    it('changes the item re-read under the lock', async () => {
      const locked = buildItem({ text: 'Renamed meanwhile' });
      items.findOwned.mockResolvedValue(buildItem());
      bound.findInCard.mockResolvedValue(locked);

      await service.update(OWNER_ID, ITEM_ID, { done: true });

      expect(bound.save).toHaveBeenCalledWith(locked);
      expect(locked).toMatchObject({ text: 'Renamed meanwhile', done: true });
    });
  });

  describe('move', () => {
    it('moves up by shifting the items in between down', async () => {
      givenItem(buildItem({ position: 3 }), 5);

      const result = await service.move(OWNER_ID, ITEM_ID, 1);

      expect(bound.shift).toHaveBeenCalledWith(CARD_ID, 1, 2, 1);
      expect(bound.save).toHaveBeenCalledWith(
        expect.objectContaining({ position: 1 }),
      );
      expect(result.position).toBe(1);
    });

    it('moves down by shifting the items in between up', async () => {
      givenItem(buildItem({ position: 1 }), 5);

      await service.move(OWNER_ID, ITEM_ID, 3);

      expect(bound.shift).toHaveBeenCalledWith(CARD_ID, 2, 3, -1);
      expect(bound.save).toHaveBeenCalledWith(
        expect.objectContaining({ position: 3 }),
      );
    });

    it('clamps a position past the end to the last slot', async () => {
      givenItem(buildItem({ position: 0 }), 3);

      await service.move(OWNER_ID, ITEM_ID, 99);

      expect(bound.shift).toHaveBeenCalledWith(CARD_ID, 1, 2, -1);
      expect(bound.save).toHaveBeenCalledWith(
        expect.objectContaining({ position: 2 }),
      );
    });

    it.each([
      ['the same position', 2],
      ['a position clamped back to it', 99],
    ])(
      'leaves the last item alone when moved to %s',
      async (_case, position) => {
        const item = buildItem({ position: 2 });
        givenItem(item, 3);

        const result = await service.move(OWNER_ID, ITEM_ID, position);

        expect(result).toBe(item);
        expectNoWrites();
      },
    );

    it('moves from the position re-read under the lock', async () => {
      items.findOwned.mockResolvedValue(buildItem({ position: 0 }));
      bound.findInCard.mockResolvedValue(buildItem({ position: 2 }));
      bound.countInCard.mockResolvedValue(3);

      await service.move(OWNER_ID, ITEM_ID, 0);

      expect(bound.shift).toHaveBeenCalledWith(CARD_ID, 0, 1, 1);
    });
  });

  describe('remove', () => {
    it('deletes the item and closes the gap after it', async () => {
      givenItem(buildItem({ position: 1 }), 4);

      await service.remove(OWNER_ID, ITEM_ID);

      expect(bound.delete).toHaveBeenCalledWith(ITEM_ID);
      expect(bound.shift).toHaveBeenCalledWith(CARD_ID, 2, 3, -1);
    });

    it('shifts nothing when the last item is deleted', async () => {
      givenItem(buildItem({ position: 3 }), 4);

      await service.remove(OWNER_ID, ITEM_ID);

      expect(bound.delete).toHaveBeenCalledWith(ITEM_ID);
      expect(bound.shift).not.toHaveBeenCalled();
    });
  });
});
