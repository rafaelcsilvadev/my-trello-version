import type { Board } from '../../../src/boards/board.entity';
import {
  BoardArchivedError,
  BoardNotFoundError,
} from '../../../src/boards/boards.errors';
import type { BoardsService } from '../../../src/boards/boards.service';
import type { Card } from '../../../src/cards/card.entity';
import {
  CardArchivedError,
  CardNotFoundError,
} from '../../../src/cards/cards.errors';
import type { CardsRepository } from '../../../src/cards/cards.repository';
import { CardsService } from '../../../src/cards/cards.service';
import type { List } from '../../../src/lists/list.entity';
import {
  ListArchivedError,
  ListNotFoundError,
} from '../../../src/lists/lists.errors';
import type { ListsService } from '../../../src/lists/lists.service';

const OWNER_ID = '7f3c2a8e-1b4d-4c6e-9a0f-2d5b8c1e7a90';
const BOARD_ID = '3b1e9d4a-6c2f-4e8b-a7d0-5f9c1b2e8a64';
const LIST_ID = 'c4a7e2d1-9b3f-4a6e-8d0c-1f5b7e9a2c38';
const CARD_ID = 'e8d2b6a4-3c1f-4b9e-a5d7-0f6c2e8b4a17';
const ARCHIVED_AT = new Date('2026-10-16T09:00:00Z');

type CardsRepositoryMock = jest.Mocked<
  Pick<
    CardsRepository,
    | 'transaction'
    | 'lockOwnedBoard'
    | 'findOwned'
    | 'findOwnedList'
    | 'findListInBoard'
    | 'listInList'
    | 'listInBoard'
    | 'countActive'
    | 'create'
    | 'shift'
    | 'save'
    | 'delete'
  >
>;

type ListsServiceMock = jest.Mocked<Pick<ListsService, 'findOwned'>>;
type BoardsServiceMock = jest.Mocked<Pick<BoardsService, 'findOwned'>>;

function buildBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: BOARD_ID,
    ownerId: OWNER_ID,
    title: 'Roadmap',
    description: null,
    archivedAt: null,
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
    ...overrides,
  };
}

function buildList(overrides: Partial<List> = {}): List {
  return {
    id: LIST_ID,
    boardId: BOARD_ID,
    title: 'To do',
    position: 0,
    archivedAt: null,
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
    ...overrides,
  };
}

function buildArchivedList(): List {
  return buildList({ position: null, archivedAt: ARCHIVED_AT });
}

function buildCard(overrides: Partial<Card> = {}): Card {
  return {
    id: CARD_ID,
    listId: LIST_ID,
    title: 'Write spec',
    description: 'First draft',
    dueDate: '2026-11-01',
    done: false,
    position: 1,
    archivedAt: null,
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
    ...overrides,
  };
}

function buildArchivedCard(): Card {
  return buildCard({ position: null, archivedAt: ARCHIVED_AT });
}

describe('CardsService', () => {
  let cards: CardsRepositoryMock;
  let lists: ListsServiceMock;
  let boards: BoardsServiceMock;
  let service: CardsService;

  // Every write path creates, shifts, saves or deletes a card; none of them
  // may run when a guard rejects the call.
  function expectNoWrites(): void {
    expect(cards.create).not.toHaveBeenCalled();
    expect(cards.shift).not.toHaveBeenCalled();
    expect(cards.save).not.toHaveBeenCalled();
    expect(cards.delete).not.toHaveBeenCalled();
  }

  // findOwned and findOwnedList answer the lookups before the transaction;
  // findOwned and findListInBoard answer the re-reads under the board lock.
  function givenCard(
    card: Card,
    { list = buildList(), board = buildBoard() } = {},
  ): void {
    cards.findOwned.mockResolvedValue(card);
    cards.findOwnedList.mockResolvedValue(list);
    cards.lockOwnedBoard.mockResolvedValue(board);
    cards.findListInBoard.mockResolvedValue(list);
  }

  beforeEach(() => {
    cards = {
      transaction: jest.fn(),
      lockOwnedBoard: jest.fn(),
      findOwned: jest.fn(),
      findOwnedList: jest.fn(),
      findListInBoard: jest.fn(),
      listInList: jest.fn(),
      listInBoard: jest.fn(),
      countActive: jest.fn(),
      create: jest.fn(),
      shift: jest.fn(),
      save: jest.fn((card: Card) => Promise.resolve(card)),
      delete: jest.fn(),
    };
    cards.transaction.mockImplementation((work) =>
      work(cards as unknown as CardsRepository),
    );
    lists = { findOwned: jest.fn() };
    boards = { findOwned: jest.fn() };
    service = new CardsService(
      cards as unknown as CardsRepository,
      lists as unknown as ListsService,
      boards as unknown as BoardsService,
    );
  });

  describe('findOwned', () => {
    it('returns the owned card', async () => {
      const card = buildCard();
      cards.findOwned.mockResolvedValue(card);

      await expect(service.findOwned(OWNER_ID, CARD_ID)).resolves.toBe(card);
      expect(cards.findOwned).toHaveBeenCalledWith(OWNER_ID, CARD_ID);
    });

    it('throws CardNotFoundError when no owned card matches', async () => {
      cards.findOwned.mockResolvedValue(null);

      await expect(service.findOwned(OWNER_ID, CARD_ID)).rejects.toBeInstanceOf(
        CardNotFoundError,
      );
    });

    it('throws CardNotFoundError for a non-UUID id without querying', async () => {
      await expect(
        service.findOwned(OWNER_ID, 'not-a-uuid'),
      ).rejects.toBeInstanceOf(CardNotFoundError);
      expect(cards.findOwned).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    function givenList(list: List, { board = buildBoard() } = {}): void {
      cards.findOwnedList.mockResolvedValue(list);
      cards.lockOwnedBoard.mockResolvedValue(board);
      cards.findListInBoard.mockResolvedValue(list);
    }

    it('creates the card at the end of the active cards under the board lock', async () => {
      const created = buildCard({ position: 3 });
      givenList(buildList());
      cards.countActive.mockResolvedValue(3);
      cards.create.mockResolvedValue(created);

      const result = await service.create(OWNER_ID, LIST_ID, {
        title: 'Write spec',
        description: 'First draft',
        dueDate: '2026-11-01',
      });

      expect(cards.findOwnedList).toHaveBeenCalledWith(OWNER_ID, LIST_ID);
      expect(cards.lockOwnedBoard).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
      expect(cards.findListInBoard).toHaveBeenCalledWith(BOARD_ID, LIST_ID);
      expect(cards.countActive).toHaveBeenCalledWith(LIST_ID);
      expect(cards.create).toHaveBeenCalledWith({
        listId: LIST_ID,
        title: 'Write spec',
        description: 'First draft',
        dueDate: '2026-11-01',
        position: 3,
      });
      expect(result).toBe(created);
    });

    it('creates the first card of a list at position 0 with null description and dueDate when absent', async () => {
      givenList(buildList());
      cards.countActive.mockResolvedValue(0);

      await service.create(OWNER_ID, LIST_ID, { title: 'Review' });

      expect(cards.create).toHaveBeenCalledWith({
        listId: LIST_ID,
        title: 'Review',
        description: null,
        dueDate: null,
        position: 0,
      });
    });

    it('throws ListNotFoundError for a non-UUID list id without querying', async () => {
      await expect(
        service.create(OWNER_ID, 'not-a-uuid', { title: 'Review' }),
      ).rejects.toBeInstanceOf(ListNotFoundError);
      expect(cards.findOwnedList).not.toHaveBeenCalled();
      expectNoWrites();
    });

    it('throws ListNotFoundError when the owner has no such list', async () => {
      cards.findOwnedList.mockResolvedValue(null);

      await expect(
        service.create(OWNER_ID, LIST_ID, { title: 'Review' }),
      ).rejects.toBeInstanceOf(ListNotFoundError);
      expect(cards.lockOwnedBoard).not.toHaveBeenCalled();
      expectNoWrites();
    });

    it('throws ListNotFoundError when the board is gone under the lock', async () => {
      givenList(buildList());
      cards.lockOwnedBoard.mockResolvedValue(null);

      await expect(
        service.create(OWNER_ID, LIST_ID, { title: 'Review' }),
      ).rejects.toBeInstanceOf(ListNotFoundError);
      expectNoWrites();
    });

    it('throws ListNotFoundError when the list is gone under the lock', async () => {
      givenList(buildList());
      cards.findListInBoard.mockResolvedValue(null);

      await expect(
        service.create(OWNER_ID, LIST_ID, { title: 'Review' }),
      ).rejects.toBeInstanceOf(ListNotFoundError);
      expectNoWrites();
    });

    it.each([
      ['an active list', buildList()],
      ['an archived list', buildArchivedList()],
    ])(
      'throws BoardArchivedError on %s of an archived board without creating',
      async (_state, list) => {
        givenList(list, { board: buildBoard({ archivedAt: ARCHIVED_AT }) });

        await expect(
          service.create(OWNER_ID, LIST_ID, { title: 'Review' }),
        ).rejects.toBeInstanceOf(BoardArchivedError);
        expectNoWrites();
      },
    );

    it('throws ListArchivedError on an archived list without creating', async () => {
      givenList(buildArchivedList());

      await expect(
        service.create(OWNER_ID, LIST_ID, { title: 'Review' }),
      ).rejects.toBeInstanceOf(ListArchivedError);
      expectNoWrites();
    });
  });

  describe('listInList', () => {
    it.each([false, true])(
      'checks the list, then returns its cards with archived %s',
      async (archived) => {
        const inList = [buildCard()];
        lists.findOwned.mockResolvedValue(buildList());
        cards.listInList.mockResolvedValue(inList);

        const result = await service.listInList(OWNER_ID, LIST_ID, archived);

        expect(lists.findOwned).toHaveBeenCalledWith(OWNER_ID, LIST_ID);
        expect(cards.listInList).toHaveBeenCalledWith(LIST_ID, archived);
        expect(result).toBe(inList);
      },
    );

    it('propagates ListNotFoundError without listing', async () => {
      lists.findOwned.mockRejectedValue(new ListNotFoundError());

      await expect(
        service.listInList(OWNER_ID, LIST_ID, false),
      ).rejects.toBeInstanceOf(ListNotFoundError);
      expect(cards.listInList).not.toHaveBeenCalled();
    });
  });

  describe('listInBoard', () => {
    it.each([false, true])(
      'checks the board, then returns its cards with archived %s',
      async (archived) => {
        const inBoard = [buildCard()];
        boards.findOwned.mockResolvedValue(buildBoard());
        cards.listInBoard.mockResolvedValue(inBoard);

        const result = await service.listInBoard(OWNER_ID, BOARD_ID, archived);

        expect(boards.findOwned).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
        expect(cards.listInBoard).toHaveBeenCalledWith(BOARD_ID, archived);
        expect(result).toBe(inBoard);
      },
    );

    it('propagates BoardNotFoundError without listing', async () => {
      boards.findOwned.mockRejectedValue(new BoardNotFoundError());

      await expect(
        service.listInBoard(OWNER_ID, BOARD_ID, false),
      ).rejects.toBeInstanceOf(BoardNotFoundError);
      expect(cards.listInBoard).not.toHaveBeenCalled();
    });
  });

  // Shared item-write flow (writeLocked): lookup → board lock → re-read card
  // and list → board archived → list archived → card state.
  describe('update guards', () => {
    const update = (id: string) =>
      service.update(OWNER_ID, id, { title: 'Review' });

    it('throws CardNotFoundError for a non-UUID id without querying', async () => {
      await expect(update('not-a-uuid')).rejects.toBeInstanceOf(
        CardNotFoundError,
      );
      expect(cards.findOwned).not.toHaveBeenCalled();
      expectNoWrites();
    });

    it('throws CardNotFoundError when the owner has no such card', async () => {
      cards.findOwned.mockResolvedValue(null);

      await expect(update(CARD_ID)).rejects.toBeInstanceOf(CardNotFoundError);
      expect(cards.lockOwnedBoard).not.toHaveBeenCalled();
      expectNoWrites();
    });

    it('locks the board of the card list and throws CardNotFoundError when it is gone', async () => {
      givenCard(buildCard());
      cards.lockOwnedBoard.mockResolvedValue(null);

      await expect(update(CARD_ID)).rejects.toBeInstanceOf(CardNotFoundError);
      expect(cards.findOwnedList).toHaveBeenCalledWith(OWNER_ID, LIST_ID);
      expect(cards.lockOwnedBoard).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
      expectNoWrites();
    });

    it('throws CardNotFoundError when the card list is gone before the lock', async () => {
      givenCard(buildCard());
      cards.findOwnedList.mockResolvedValue(null);

      await expect(update(CARD_ID)).rejects.toBeInstanceOf(CardNotFoundError);
      expect(cards.lockOwnedBoard).not.toHaveBeenCalled();
      expectNoWrites();
    });

    it('throws CardNotFoundError when the card is gone under the lock', async () => {
      givenCard(buildCard());
      cards.findOwned
        .mockResolvedValueOnce(buildCard())
        .mockResolvedValue(null);

      await expect(update(CARD_ID)).rejects.toBeInstanceOf(CardNotFoundError);
      expectNoWrites();
    });

    it('throws CardNotFoundError when the list is gone under the lock', async () => {
      givenCard(buildCard());
      cards.findListInBoard.mockResolvedValue(null);

      await expect(update(CARD_ID)).rejects.toBeInstanceOf(CardNotFoundError);
      expectNoWrites();
    });

    it('re-reads the list of the card as read under the lock', async () => {
      const otherListId = 'a9c1e5d3-7b2f-4d8a-9e6c-3b0f1d7a5e92';
      givenCard(buildCard());
      cards.findOwned
        .mockResolvedValueOnce(buildCard())
        .mockResolvedValue(buildCard({ listId: otherListId }));

      await update(CARD_ID);

      expect(cards.findListInBoard).toHaveBeenCalledWith(BOARD_ID, otherListId);
    });

    it.each([
      ['an active card of an active list', buildCard(), buildList()],
      [
        'an archived card of an archived list',
        buildArchivedCard(),
        buildArchivedList(),
      ],
    ])(
      'throws BoardArchivedError on %s of an archived board without saving',
      async (_state, card, list) => {
        givenCard(card, {
          list,
          board: buildBoard({ archivedAt: ARCHIVED_AT }),
        });

        await expect(update(CARD_ID)).rejects.toBeInstanceOf(
          BoardArchivedError,
        );
        expectNoWrites();
      },
    );

    it.each([
      ['an active card', buildCard()],
      ['an archived card', buildArchivedCard()],
    ])(
      'throws ListArchivedError on %s of an archived list without saving',
      async (_state, card) => {
        givenCard(card, { list: buildArchivedList() });

        await expect(update(CARD_ID)).rejects.toBeInstanceOf(ListArchivedError);
        expectNoWrites();
      },
    );
  });

  describe('update', () => {
    it('saves only the given fields under the board lock', async () => {
      givenCard(buildCard());

      const result = await service.update(OWNER_ID, CARD_ID, { done: true });

      expect(cards.transaction).toHaveBeenCalled();
      expect(result).toEqual(buildCard({ done: true }));
      expect(cards.save).toHaveBeenCalledWith(buildCard({ done: true }));
    });

    it('saves every field when all are given', async () => {
      givenCard(buildCard());

      const result = await service.update(OWNER_ID, CARD_ID, {
        title: 'Review',
        description: 'Second pass',
        dueDate: '2026-12-24',
        done: true,
      });

      const expected = buildCard({
        title: 'Review',
        description: 'Second pass',
        dueDate: '2026-12-24',
        done: true,
      });
      expect(result).toEqual(expected);
      expect(cards.save).toHaveBeenCalledWith(expected);
    });

    it('clears description and dueDate when given null', async () => {
      givenCard(buildCard());

      const result = await service.update(OWNER_ID, CARD_ID, {
        description: null,
        dueDate: null,
      });

      expect(result).toEqual(buildCard({ description: null, dueDate: null }));
      expect(cards.save).toHaveBeenCalledWith(
        buildCard({ description: null, dueDate: null }),
      );
    });

    it('returns the card unchanged without saving for an empty change set', async () => {
      givenCard(buildCard());

      const result = await service.update(OWNER_ID, CARD_ID, {});

      expect(result).toEqual(buildCard());
      expectNoWrites();
    });

    it('treats fields set to undefined as absent', async () => {
      givenCard(buildCard());

      const result = await service.update(OWNER_ID, CARD_ID, {
        title: undefined,
        done: undefined,
      });

      expect(result).toEqual(buildCard());
      expectNoWrites();
    });

    it.each([
      ['a change', { done: true }],
      ['an empty change set', {}],
    ])(
      'throws CardArchivedError on an archived card for %s without saving',
      async (_case, changes) => {
        givenCard(buildArchivedCard());

        await expect(
          service.update(OWNER_ID, CARD_ID, changes),
        ).rejects.toBeInstanceOf(CardArchivedError);
        expectNoWrites();
      },
    );
  });
});
