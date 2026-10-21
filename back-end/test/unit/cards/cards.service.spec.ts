import type { EntityManager } from 'typeorm';
import type { Board } from '../../../src/boards/board.entity';
import {
  BoardArchivedError,
  BoardNotFoundError,
} from '../../../src/boards/boards.errors';
import type { BoardsService } from '../../../src/boards/boards.service';
import type { Card } from '../../../src/cards/card.entity';
import {
  CardArchivedError,
  CardNotArchivedError,
  CardNotFoundError,
} from '../../../src/cards/cards.errors';
import type {
  CardsRepository,
  ChecklistProgress,
} from '../../../src/cards/cards.repository';
import { CardsService, type CardView } from '../../../src/cards/cards.service';
import type { Label } from '../../../src/labels/label.entity';
import { LabelNotFoundError } from '../../../src/labels/labels.errors';
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
const TARGET_LIST_ID = 'a9c1e5d3-7b2f-4d8a-9e6c-3b0f1d7a5e92';
const ARCHIVED_AT = new Date('2026-10-16T09:00:00Z');
const BUG_LABEL_ID = 'f1b3d5a7-2c4e-4f6a-8b0d-9e1c3a5b7d24';
const IDEA_LABEL_ID = 'd6e8a0c2-4b6d-4e8f-9a1c-3e5b7d9f1a36';
const NO_ITEMS: ChecklistProgress = { total: 0, done: 0 };
// Stands for the transaction's manager: the mocked transaction hands work the
// same repository, so its manager is the one writeActiveCard must pass on.
const TX_MANAGER = {} as EntityManager;

type CardsRepositoryMock = jest.Mocked<
  Pick<
    CardsRepository,
    | 'transaction'
    | 'lockOwnedBoard'
    | 'findOwned'
    | 'findOwnedList'
    | 'findListInBoard'
    | 'findLabelInBoard'
    | 'listInList'
    | 'listInBoard'
    | 'countActive'
    | 'create'
    | 'shift'
    | 'linkLabel'
    | 'unlinkLabel'
    | 'labelIdsByCard'
    | 'checklistCountsByCard'
    | 'save'
    | 'delete'
    | 'manager'
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

function buildLabel(overrides: Partial<Label> = {}): Label {
  return {
    id: BUG_LABEL_ID,
    boardId: BOARD_ID,
    name: 'Bug',
    color: 'red',
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
    ...overrides,
  };
}

function withLabels(
  card: Card,
  labelIds: string[] = [],
  checklist: ChecklistProgress = NO_ITEMS,
): CardView {
  return Object.assign({}, card, { labelIds, checklist });
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

  // labelIdsByCard maps every requested card id, [] when it has no labels.
  function givenLabelIds(byCard: Record<string, string[]>): void {
    cards.labelIdsByCard.mockImplementation((cardIds) =>
      Promise.resolve(new Map(cardIds.map((id) => [id, byCard[id] ?? []]))),
    );
  }

  // checklistCountsByCard maps every requested card id, NO_ITEMS when it has
  // no items.
  function givenChecklists(byCard: Record<string, ChecklistProgress>): void {
    cards.checklistCountsByCard.mockImplementation((cardIds) =>
      Promise.resolve(
        new Map(cardIds.map((id) => [id, byCard[id] ?? NO_ITEMS])),
      ),
    );
  }

  beforeEach(() => {
    cards = {
      transaction: jest.fn(),
      lockOwnedBoard: jest.fn(),
      findOwned: jest.fn(),
      findOwnedList: jest.fn(),
      findListInBoard: jest.fn(),
      findLabelInBoard: jest.fn(),
      listInList: jest.fn(),
      listInBoard: jest.fn(),
      countActive: jest.fn(),
      create: jest.fn(),
      shift: jest.fn(),
      linkLabel: jest.fn(),
      unlinkLabel: jest.fn(),
      labelIdsByCard: jest.fn(),
      checklistCountsByCard: jest.fn(),
      save: jest.fn((card: Card) => Promise.resolve(card)),
      delete: jest.fn(),
      manager: TX_MANAGER,
    };
    cards.transaction.mockImplementation((work) =>
      work(cards as unknown as CardsRepository),
    );
    givenLabelIds({});
    givenChecklists({});
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

      await expect(service.findOwned(OWNER_ID, CARD_ID)).resolves.toEqual(
        withLabels(card),
      );
      expect(cards.findOwned).toHaveBeenCalledWith(OWNER_ID, CARD_ID);
    });

    it('returns the card with its labelIds from one labelIdsByCard call', async () => {
      cards.findOwned.mockResolvedValue(buildCard());
      givenLabelIds({ [CARD_ID]: [BUG_LABEL_ID, IDEA_LABEL_ID] });

      await expect(service.findOwned(OWNER_ID, CARD_ID)).resolves.toEqual(
        withLabels(buildCard(), [BUG_LABEL_ID, IDEA_LABEL_ID]),
      );
      expect(cards.labelIdsByCard).toHaveBeenCalledTimes(1);
      expect(cards.labelIdsByCard).toHaveBeenCalledWith([CARD_ID]);
    });

    it('returns the card with its checklist from one checklistCountsByCard call', async () => {
      cards.findOwned.mockResolvedValue(buildCard());
      givenChecklists({ [CARD_ID]: { total: 3, done: 1 } });

      await expect(service.findOwned(OWNER_ID, CARD_ID)).resolves.toEqual(
        withLabels(buildCard(), [], { total: 3, done: 1 }),
      );
      expect(cards.checklistCountsByCard).toHaveBeenCalledTimes(1);
      expect(cards.checklistCountsByCard).toHaveBeenCalledWith([CARD_ID]);
    });

    it('returns the card with both its labelIds and its checklist', async () => {
      cards.findOwned.mockResolvedValue(buildCard());
      givenLabelIds({ [CARD_ID]: [BUG_LABEL_ID] });
      givenChecklists({ [CARD_ID]: { total: 2, done: 2 } });

      await expect(service.findOwned(OWNER_ID, CARD_ID)).resolves.toEqual(
        withLabels(buildCard(), [BUG_LABEL_ID], { total: 2, done: 2 }),
      );
    });

    it('throws CardNotFoundError when no owned card matches', async () => {
      cards.findOwned.mockResolvedValue(null);

      await expect(service.findOwned(OWNER_ID, CARD_ID)).rejects.toBeInstanceOf(
        CardNotFoundError,
      );
      expect(cards.labelIdsByCard).not.toHaveBeenCalled();
      expect(cards.checklistCountsByCard).not.toHaveBeenCalled();
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
      expect(result).toEqual(withLabels(created));
    });

    it('returns the new card with labelIds [] without reading labels', async () => {
      givenList(buildList());
      cards.countActive.mockResolvedValue(0);
      cards.create.mockResolvedValue(buildCard({ position: 0 }));

      const result = await service.create(OWNER_ID, LIST_ID, {
        title: 'Write spec',
      });

      expect(result.labelIds).toEqual([]);
      expect(cards.labelIdsByCard).not.toHaveBeenCalled();
    });

    it('returns the new card with checklist { total: 0, done: 0 } without counting items', async () => {
      givenList(buildList());
      cards.countActive.mockResolvedValue(0);
      cards.create.mockResolvedValue(buildCard({ position: 0 }));
      givenChecklists({ [CARD_ID]: { total: 3, done: 1 } });

      const result = await service.create(OWNER_ID, LIST_ID, {
        title: 'Write spec',
      });

      expect(result.checklist).toEqual({ total: 0, done: 0 });
      expect(cards.checklistCountsByCard).not.toHaveBeenCalled();
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
        expect(result).toEqual([withLabels(buildCard())]);
      },
    );

    it('returns each card with its labelIds from one labelIdsByCard call', async () => {
      const other = buildCard({ id: TARGET_LIST_ID, position: 2 });
      lists.findOwned.mockResolvedValue(buildList());
      cards.listInList.mockResolvedValue([buildCard(), other]);
      givenLabelIds({ [CARD_ID]: [BUG_LABEL_ID], [other.id]: [IDEA_LABEL_ID] });

      const result = await service.listInList(OWNER_ID, LIST_ID, false);

      expect(result).toEqual([
        withLabels(buildCard(), [BUG_LABEL_ID]),
        withLabels(other, [IDEA_LABEL_ID]),
      ]);
      expect(cards.labelIdsByCard).toHaveBeenCalledTimes(1);
      expect(cards.labelIdsByCard).toHaveBeenCalledWith([CARD_ID, other.id]);
    });

    it('returns each card with its checklist from one checklistCountsByCard call', async () => {
      const other = buildCard({ id: TARGET_LIST_ID, position: 2 });
      lists.findOwned.mockResolvedValue(buildList());
      cards.listInList.mockResolvedValue([buildCard(), other]);
      givenChecklists({
        [CARD_ID]: { total: 3, done: 1 },
        [other.id]: { total: 2, done: 2 },
      });

      const result = await service.listInList(OWNER_ID, LIST_ID, false);

      expect(result).toEqual([
        withLabels(buildCard(), [], { total: 3, done: 1 }),
        withLabels(other, [], { total: 2, done: 2 }),
      ]);
      expect(cards.checklistCountsByCard).toHaveBeenCalledTimes(1);
      expect(cards.checklistCountsByCard).toHaveBeenCalledWith([
        CARD_ID,
        other.id,
      ]);
    });

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
        expect(result).toEqual([withLabels(buildCard())]);
      },
    );

    it('returns each card with its labelIds from one labelIdsByCard call', async () => {
      const other = buildCard({ id: TARGET_LIST_ID, listId: TARGET_LIST_ID });
      boards.findOwned.mockResolvedValue(buildBoard());
      cards.listInBoard.mockResolvedValue([buildCard(), other]);
      givenLabelIds({ [other.id]: [BUG_LABEL_ID, IDEA_LABEL_ID] });

      const result = await service.listInBoard(OWNER_ID, BOARD_ID, true);

      expect(result).toEqual([
        withLabels(buildCard()),
        withLabels(other, [BUG_LABEL_ID, IDEA_LABEL_ID]),
      ]);
      expect(cards.labelIdsByCard).toHaveBeenCalledTimes(1);
      expect(cards.labelIdsByCard).toHaveBeenCalledWith([CARD_ID, other.id]);
    });

    it('returns each card with its checklist from one checklistCountsByCard call', async () => {
      const other = buildCard({ id: TARGET_LIST_ID, listId: TARGET_LIST_ID });
      boards.findOwned.mockResolvedValue(buildBoard());
      cards.listInBoard.mockResolvedValue([buildCard(), other]);
      givenChecklists({ [other.id]: { total: 4, done: 3 } });

      const result = await service.listInBoard(OWNER_ID, BOARD_ID, true);

      expect(result).toEqual([
        withLabels(buildCard()),
        withLabels(other, [], { total: 4, done: 3 }),
      ]);
      expect(cards.checklistCountsByCard).toHaveBeenCalledTimes(1);
      expect(cards.checklistCountsByCard).toHaveBeenCalledWith([
        CARD_ID,
        other.id,
      ]);
    });

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
      expect(result).toEqual(withLabels(buildCard({ done: true })));
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
      expect(result).toEqual(withLabels(expected));
      expect(cards.save).toHaveBeenCalledWith(expected);
    });

    it('clears description and dueDate when given null', async () => {
      givenCard(buildCard());

      const result = await service.update(OWNER_ID, CARD_ID, {
        description: null,
        dueDate: null,
      });

      expect(result).toEqual(
        withLabels(buildCard({ description: null, dueDate: null })),
      );
      expect(cards.save).toHaveBeenCalledWith(
        buildCard({ description: null, dueDate: null }),
      );
    });

    it('returns the card unchanged without saving for an empty change set', async () => {
      givenCard(buildCard());

      const result = await service.update(OWNER_ID, CARD_ID, {});

      expect(result).toEqual(withLabels(buildCard()));
      expectNoWrites();
    });

    it('treats fields set to undefined as absent', async () => {
      givenCard(buildCard());

      const result = await service.update(OWNER_ID, CARD_ID, {
        title: undefined,
        done: undefined,
      });

      expect(result).toEqual(withLabels(buildCard()));
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
  describe('move within the list', () => {
    // The card sits at position 1 of a list with 4 active cards.
    beforeEach(() => {
      givenCard(buildCard({ position: 1 }));
      cards.countActive.mockResolvedValue(4);
    });

    it('shifts [k, i-1] by +1 when moving up', async () => {
      const result = await service.move(OWNER_ID, CARD_ID, { position: 0 });

      expect(cards.countActive).toHaveBeenCalledWith(LIST_ID);
      expect(cards.shift).toHaveBeenCalledTimes(1);
      expect(cards.shift).toHaveBeenCalledWith(LIST_ID, 0, 0, 1);
      expect(cards.save).toHaveBeenCalledWith(buildCard({ position: 0 }));
      expect(result).toEqual(withLabels(buildCard({ position: 0 })));
    });

    it('shifts [i+1, k] by -1 when moving down', async () => {
      const result = await service.move(OWNER_ID, CARD_ID, { position: 3 });

      expect(cards.shift).toHaveBeenCalledTimes(1);
      expect(cards.shift).toHaveBeenCalledWith(LIST_ID, 2, 3, -1);
      expect(result).toEqual(withLabels(buildCard({ position: 3 })));
    });

    it('clamps a position past the end to n-1', async () => {
      const result = await service.move(OWNER_ID, CARD_ID, { position: 99 });

      expect(cards.shift).toHaveBeenCalledWith(LIST_ID, 2, 3, -1);
      expect(result).toEqual(withLabels(buildCard({ position: 3 })));
    });

    it.each([
      ['without listId', { position: 1 }],
      ['with listId equal to the card list', { listId: LIST_ID, position: 1 }],
    ])(
      'returns the card unchanged without shift or save for the same place %s',
      async (_case, target) => {
        const result = await service.move(OWNER_ID, CARD_ID, target);

        expect(result).toEqual(withLabels(buildCard({ position: 1 })));
        expect(cards.findListInBoard).toHaveBeenCalledTimes(1);
        expectNoWrites();
      },
    );

    it('treats a clamped position equal to the current one as the same place', async () => {
      givenCard(buildCard({ position: 3 }));

      const result = await service.move(OWNER_ID, CARD_ID, { position: 99 });

      expect(result).toEqual(withLabels(buildCard({ position: 3 })));
      expectNoWrites();
    });
  });

  describe('move across lists', () => {
    const target = buildList({ id: TARGET_LIST_ID, position: 1 });

    // Source list (LIST_ID) holds n active cards, target holds m.
    function givenLists({ n, m }: { n: number; m: number }): void {
      cards.findListInBoard.mockImplementation((_boardId, listId) =>
        Promise.resolve(
          listId === LIST_ID
            ? buildList()
            : listId === TARGET_LIST_ID
              ? target
              : null,
        ),
      );
      cards.countActive.mockImplementation((listId) =>
        Promise.resolve(listId === LIST_ID ? n : m),
      );
    }

    beforeEach(() => {
      givenCard(buildCard({ position: 1 }));
    });

    it('closes the gap in the source, opens one in the target and saves the new list and position', async () => {
      givenLists({ n: 4, m: 3 });

      const result = await service.move(OWNER_ID, CARD_ID, {
        listId: TARGET_LIST_ID,
        position: 1,
      });

      expect(cards.findListInBoard).toHaveBeenCalledWith(
        BOARD_ID,
        TARGET_LIST_ID,
      );
      expect(cards.shift).toHaveBeenCalledTimes(2);
      expect(cards.shift).toHaveBeenNthCalledWith(1, LIST_ID, 2, 3, -1);
      expect(cards.shift).toHaveBeenNthCalledWith(2, TARGET_LIST_ID, 1, 2, 1);
      const moved = buildCard({ listId: TARGET_LIST_ID, position: 1 });
      expect(cards.save).toHaveBeenCalledWith(moved);
      expect(result).toEqual(withLabels(moved));
    });

    it('clamps a position past the end of the target to m without a target shift', async () => {
      givenLists({ n: 4, m: 3 });

      const result = await service.move(OWNER_ID, CARD_ID, {
        listId: TARGET_LIST_ID,
        position: 99,
      });

      expect(cards.shift).toHaveBeenCalledTimes(1);
      expect(cards.shift).toHaveBeenCalledWith(LIST_ID, 2, 3, -1);
      expect(result).toEqual(
        withLabels(buildCard({ listId: TARGET_LIST_ID, position: 3 })),
      );
    });

    it('moves into an empty target at position 0 without a target shift', async () => {
      givenLists({ n: 4, m: 0 });

      const result = await service.move(OWNER_ID, CARD_ID, {
        listId: TARGET_LIST_ID,
        position: 5,
      });

      expect(cards.shift).toHaveBeenCalledTimes(1);
      expect(cards.shift).toHaveBeenCalledWith(LIST_ID, 2, 3, -1);
      expect(result).toEqual(
        withLabels(buildCard({ listId: TARGET_LIST_ID, position: 0 })),
      );
    });

    it('skips the source shift when the card is the last of its list', async () => {
      givenLists({ n: 2, m: 3 });

      await service.move(OWNER_ID, CARD_ID, {
        listId: TARGET_LIST_ID,
        position: 0,
      });

      expect(cards.shift).toHaveBeenCalledTimes(1);
      expect(cards.shift).toHaveBeenCalledWith(TARGET_LIST_ID, 0, 2, 1);
    });

    it('throws CardArchivedError on an archived card before looking up the target', async () => {
      givenCard(buildArchivedCard());
      givenLists({ n: 4, m: 3 });

      await expect(
        service.move(OWNER_ID, CARD_ID, {
          listId: TARGET_LIST_ID,
          position: 0,
        }),
      ).rejects.toBeInstanceOf(CardArchivedError);
      expect(cards.findListInBoard).not.toHaveBeenCalledWith(
        BOARD_ID,
        TARGET_LIST_ID,
      );
      expectNoWrites();
    });

    it('throws ListNotFoundError when the target is not a list of the board', async () => {
      givenLists({ n: 4, m: 3 });
      const elsewhere = 'b2d4f6a8-1c3e-4a5b-9d7f-0e2c4a6b8d10';

      await expect(
        service.move(OWNER_ID, CARD_ID, { listId: elsewhere, position: 0 }),
      ).rejects.toBeInstanceOf(ListNotFoundError);
      expect(cards.findListInBoard).toHaveBeenCalledWith(BOARD_ID, elsewhere);
      expectNoWrites();
    });

    it('throws ListArchivedError when the target is archived', async () => {
      givenLists({ n: 4, m: 3 });
      cards.findListInBoard.mockImplementation((_boardId, listId) =>
        Promise.resolve(
          listId === LIST_ID
            ? buildList()
            : buildList({
                id: TARGET_LIST_ID,
                position: null,
                archivedAt: ARCHIVED_AT,
              }),
        ),
      );

      await expect(
        service.move(OWNER_ID, CARD_ID, {
          listId: TARGET_LIST_ID,
          position: 0,
        }),
      ).rejects.toBeInstanceOf(ListArchivedError);
      expectNoWrites();
    });
  });

  it('throws CardArchivedError when moving an archived card within its list', async () => {
    givenCard(buildArchivedCard());

    await expect(
      service.move(OWNER_ID, CARD_ID, { position: 0 }),
    ).rejects.toBeInstanceOf(CardArchivedError);
    expectNoWrites();
  });

  describe('archive', () => {
    it('closes the gap after the card and clears its position', async () => {
      givenCard(buildCard({ position: 1 }));
      cards.countActive.mockResolvedValue(4);

      const result = await service.archive(OWNER_ID, CARD_ID);

      expect(cards.countActive).toHaveBeenCalledWith(LIST_ID);
      expect(cards.shift).toHaveBeenCalledWith(LIST_ID, 2, 3, -1);
      expect(result.position).toBeNull();
      expect(result.archivedAt).toBeInstanceOf(Date);
      const { labelIds, checklist, ...saved } = result;
      expect(labelIds).toEqual([]);
      expect(checklist).toEqual(NO_ITEMS);
      expect(cards.save).toHaveBeenCalledWith(saved);
    });

    it('archives the last card without a shift', async () => {
      givenCard(buildCard({ position: 3 }));
      cards.countActive.mockResolvedValue(4);

      const result = await service.archive(OWNER_ID, CARD_ID);

      expect(cards.shift).not.toHaveBeenCalled();
      expect(result.position).toBeNull();
      const { labelIds, checklist, ...saved } = result;
      expect(labelIds).toEqual([]);
      expect(checklist).toEqual(NO_ITEMS);
      expect(cards.save).toHaveBeenCalledWith(saved);
    });

    it('returns an already archived card without saving', async () => {
      givenCard(buildArchivedCard());

      const result = await service.archive(OWNER_ID, CARD_ID);

      expect(result).toEqual(withLabels(buildArchivedCard()));
      expectNoWrites();
    });
  });

  describe('unarchive', () => {
    it('puts the card at the end of the active cards', async () => {
      givenCard(buildArchivedCard());
      cards.countActive.mockResolvedValue(3);

      const result = await service.unarchive(OWNER_ID, CARD_ID);

      expect(cards.countActive).toHaveBeenCalledWith(LIST_ID);
      expect(cards.shift).not.toHaveBeenCalled();
      const restored = buildCard({ position: 3, archivedAt: null });
      expect(cards.save).toHaveBeenCalledWith(restored);
      expect(result).toEqual(withLabels(restored));
    });

    it('returns an active card without saving', async () => {
      givenCard(buildCard());

      const result = await service.unarchive(OWNER_ID, CARD_ID);

      expect(result).toEqual(withLabels(buildCard()));
      expectNoWrites();
    });
  });

  describe('remove', () => {
    it('deletes an archived card', async () => {
      givenCard(buildArchivedCard());

      await expect(service.remove(OWNER_ID, CARD_ID)).resolves.toBeUndefined();
      expect(cards.delete).toHaveBeenCalledWith(CARD_ID);
      expect(cards.shift).not.toHaveBeenCalled();
    });

    it('throws CardNotArchivedError on an active card without deleting', async () => {
      givenCard(buildCard());

      await expect(service.remove(OWNER_ID, CARD_ID)).rejects.toBeInstanceOf(
        CardNotArchivedError,
      );
      expectNoWrites();
    });
  });

  // Labels and checklist counts are read once, after the write, for the card
  // it returns.
  describe('details on write results', () => {
    it.each([
      [
        'update',
        buildCard,
        (s: CardsService) => s.update(OWNER_ID, CARD_ID, { done: true }),
      ],
      [
        'move',
        buildCard,
        (s: CardsService) => s.move(OWNER_ID, CARD_ID, { position: 0 }),
      ],
      ['archive', buildCard, (s: CardsService) => s.archive(OWNER_ID, CARD_ID)],
      [
        'unarchive',
        buildArchivedCard,
        (s: CardsService) => s.unarchive(OWNER_ID, CARD_ID),
      ],
    ])(
      '%s returns the card with its labelIds from one labelIdsByCard call',
      async (_action, buildTargetCard, act) => {
        givenCard(buildTargetCard());
        cards.countActive.mockResolvedValue(4);
        givenLabelIds({ [CARD_ID]: [BUG_LABEL_ID, IDEA_LABEL_ID] });

        const result = await act(service);

        expect(result.id).toBe(CARD_ID);
        expect(result.labelIds).toEqual([BUG_LABEL_ID, IDEA_LABEL_ID]);
        expect(cards.labelIdsByCard).toHaveBeenCalledTimes(1);
        expect(cards.labelIdsByCard).toHaveBeenCalledWith([CARD_ID]);
      },
    );

    it.each([
      [
        'update',
        buildCard,
        (s: CardsService) => s.update(OWNER_ID, CARD_ID, { done: true }),
      ],
      [
        'move',
        buildCard,
        (s: CardsService) => s.move(OWNER_ID, CARD_ID, { position: 0 }),
      ],
      ['archive', buildCard, (s: CardsService) => s.archive(OWNER_ID, CARD_ID)],
      [
        'unarchive',
        buildArchivedCard,
        (s: CardsService) => s.unarchive(OWNER_ID, CARD_ID),
      ],
    ])(
      '%s returns the card with its checklist from one checklistCountsByCard call',
      async (_action, buildTargetCard, act) => {
        givenCard(buildTargetCard());
        cards.countActive.mockResolvedValue(4);
        givenChecklists({ [CARD_ID]: { total: 3, done: 1 } });

        const result = await act(service);

        expect(result.id).toBe(CARD_ID);
        expect(result.checklist).toEqual({ total: 3, done: 1 });
        expect(cards.checklistCountsByCard).toHaveBeenCalledTimes(1);
        expect(cards.checklistCountsByCard).toHaveBeenCalledWith([CARD_ID]);
      },
    );

    it('reads no labels and no checklist when the write is rejected', async () => {
      givenCard(buildArchivedCard());

      await expect(
        service.update(OWNER_ID, CARD_ID, { done: true }),
      ).rejects.toBeInstanceOf(CardArchivedError);
      expect(cards.labelIdsByCard).not.toHaveBeenCalled();
      expect(cards.checklistCountsByCard).not.toHaveBeenCalled();
    });
  });

  // Each action inherits the writeLocked guards: the board and list states
  // win over the card-state check the action would otherwise hit.
  describe.each([
    [
      'move',
      buildArchivedCard,
      (s: CardsService) => s.move(OWNER_ID, CARD_ID, { position: 0 }),
    ],
    ['archive', buildCard, (s: CardsService) => s.archive(OWNER_ID, CARD_ID)],
    [
      'unarchive',
      buildArchivedCard,
      (s: CardsService) => s.unarchive(OWNER_ID, CARD_ID),
    ],
    ['remove', buildCard, (s: CardsService) => s.remove(OWNER_ID, CARD_ID)],
  ])('%s guards', (_action, buildTargetCard, act) => {
    it('throws BoardArchivedError before ListArchivedError and the card-state check', async () => {
      givenCard(buildTargetCard(), {
        list: buildArchivedList(),
        board: buildBoard({ archivedAt: ARCHIVED_AT }),
      });

      await expect(act(service)).rejects.toBeInstanceOf(BoardArchivedError);
      expectNoWrites();
    });

    it('throws ListArchivedError before the card-state check', async () => {
      givenCard(buildTargetCard(), { list: buildArchivedList() });

      await expect(act(service)).rejects.toBeInstanceOf(ListArchivedError);
      expectNoWrites();
    });
  });

  // Apply and remove share one flow: the label is looked up under the board
  // lock, after the card re-read and before the archive guards (LBL-25).
  describe.each([
    [
      'addLabel',
      'linkLabel' as const,
      (s: CardsService, labelId: string) =>
        s.addLabel(OWNER_ID, CARD_ID, labelId),
    ],
    [
      'removeLabel',
      'unlinkLabel' as const,
      (s: CardsService, labelId: string) =>
        s.removeLabel(OWNER_ID, CARD_ID, labelId),
    ],
  ])('%s', (_action, write, act) => {
    function expectNoLabelWrites(): void {
      expect(cards.linkLabel).not.toHaveBeenCalled();
      expect(cards.unlinkLabel).not.toHaveBeenCalled();
      expectNoWrites();
    }

    it('writes the link of the card and the label of its locked board', async () => {
      givenCard(buildCard());
      cards.findLabelInBoard.mockResolvedValue(buildLabel());

      await expect(act(service, BUG_LABEL_ID)).resolves.toBeUndefined();
      expect(cards.findLabelInBoard).toHaveBeenCalledWith(
        BOARD_ID,
        BUG_LABEL_ID,
      );
      expect(cards[write]).toHaveBeenCalledTimes(1);
      expect(cards[write]).toHaveBeenCalledWith(CARD_ID, BUG_LABEL_ID);
      // The card row is never saved, so its updatedAt stays (LBL-21).
      expect(cards.save).not.toHaveBeenCalled();
    });

    it('throws LabelNotFoundError for a non-UUID labelId without querying it', async () => {
      givenCard(buildCard());

      await expect(act(service, 'not-a-uuid')).rejects.toBeInstanceOf(
        LabelNotFoundError,
      );
      expect(cards.findLabelInBoard).not.toHaveBeenCalled();
      expectNoLabelWrites();
    });

    it('throws LabelNotFoundError when the locked board has no such label', async () => {
      givenCard(buildCard());
      cards.findLabelInBoard.mockResolvedValue(null);

      await expect(act(service, IDEA_LABEL_ID)).rejects.toBeInstanceOf(
        LabelNotFoundError,
      );
      expectNoLabelWrites();
    });

    it('throws CardNotFoundError before LabelNotFoundError', async () => {
      cards.findOwned.mockResolvedValue(null);

      await expect(act(service, 'not-a-uuid')).rejects.toBeInstanceOf(
        CardNotFoundError,
      );
      expect(cards.findLabelInBoard).not.toHaveBeenCalled();
      expectNoLabelWrites();
    });

    it('throws LabelNotFoundError before BoardArchivedError', async () => {
      givenCard(buildArchivedCard(), {
        list: buildArchivedList(),
        board: buildBoard({ archivedAt: ARCHIVED_AT }),
      });
      cards.findLabelInBoard.mockResolvedValue(null);

      await expect(act(service, IDEA_LABEL_ID)).rejects.toBeInstanceOf(
        LabelNotFoundError,
      );
      expectNoLabelWrites();
    });

    it('throws BoardArchivedError before ListArchivedError and CardArchivedError', async () => {
      givenCard(buildArchivedCard(), {
        list: buildArchivedList(),
        board: buildBoard({ archivedAt: ARCHIVED_AT }),
      });
      cards.findLabelInBoard.mockResolvedValue(buildLabel());

      await expect(act(service, BUG_LABEL_ID)).rejects.toBeInstanceOf(
        BoardArchivedError,
      );
      expectNoLabelWrites();
    });

    it('throws ListArchivedError before CardArchivedError', async () => {
      givenCard(buildArchivedCard(), { list: buildArchivedList() });
      cards.findLabelInBoard.mockResolvedValue(buildLabel());

      await expect(act(service, BUG_LABEL_ID)).rejects.toBeInstanceOf(
        ListArchivedError,
      );
      expectNoLabelWrites();
    });

    it('throws CardArchivedError on an archived card', async () => {
      givenCard(buildArchivedCard());
      cards.findLabelInBoard.mockResolvedValue(buildLabel());

      await expect(act(service, BUG_LABEL_ID)).rejects.toBeInstanceOf(
        CardArchivedError,
      );
      expectNoLabelWrites();
    });
  });

  // Rows owned by a card (checklist items) are written through this hook: the
  // writeLocked guards, then the card-archived guard, then work with the
  // transaction's manager (CHK-19 to CHK-22).
  describe('writeActiveCard', () => {
    let work: jest.Mock<Promise<string>, [Card, EntityManager]>;

    const write = (
      id = CARD_ID,
      before?: (card: Card, manager: EntityManager) => Promise<void>,
    ) => service.writeActiveCard(OWNER_ID, id, work, before);

    beforeEach(() => {
      work = jest.fn().mockResolvedValue('written');
    });

    it('runs work with the locked card and the transaction manager and returns its result', async () => {
      const locked = buildCard({ title: 'Locked' });
      givenCard(buildCard());
      cards.findOwned
        .mockResolvedValueOnce(buildCard())
        .mockResolvedValue(locked);

      await expect(write()).resolves.toBe('written');
      expect(work).toHaveBeenCalledTimes(1);
      expect(work).toHaveBeenCalledWith(locked, TX_MANAGER);
      expect(cards.lockOwnedBoard).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
    });

    it('throws CardNotFoundError for a non-UUID id without querying', async () => {
      await expect(write('not-a-uuid')).rejects.toBeInstanceOf(
        CardNotFoundError,
      );
      expect(cards.findOwned).not.toHaveBeenCalled();
      expect(work).not.toHaveBeenCalled();
    });

    it('throws CardNotFoundError when the owner has no such card', async () => {
      cards.findOwned.mockResolvedValue(null);

      await expect(write()).rejects.toBeInstanceOf(CardNotFoundError);
      expect(cards.lockOwnedBoard).not.toHaveBeenCalled();
      expect(work).not.toHaveBeenCalled();
    });

    it('throws CardNotFoundError when the card is gone under the lock', async () => {
      givenCard(buildCard());
      cards.findOwned
        .mockResolvedValueOnce(buildCard())
        .mockResolvedValue(null);
      const before = jest.fn().mockResolvedValue(undefined);

      await expect(write(CARD_ID, before)).rejects.toBeInstanceOf(
        CardNotFoundError,
      );
      expect(before).not.toHaveBeenCalled();
      expect(work).not.toHaveBeenCalled();
    });

    it('runs before under the lock with the locked card and the transaction manager', async () => {
      const locked = buildCard({ title: 'Locked' });
      givenCard(buildCard());
      cards.findOwned
        .mockResolvedValueOnce(buildCard())
        .mockResolvedValue(locked);
      const before = jest.fn().mockResolvedValue(undefined);

      await write(CARD_ID, before);

      expect(before).toHaveBeenCalledWith(locked, TX_MANAGER);
      expect(cards.lockOwnedBoard.mock.invocationCallOrder[0]).toBeLessThan(
        before.mock.invocationCallOrder[0],
      );
      expect(before.mock.invocationCallOrder[0]).toBeLessThan(
        work.mock.invocationCallOrder[0],
      );
    });

    it('throws the error of before ahead of the board, list and card archived checks', async () => {
      class BeforeError extends Error {}
      givenCard(buildArchivedCard(), {
        list: buildArchivedList(),
        board: buildBoard({ archivedAt: ARCHIVED_AT }),
      });

      await expect(
        write(CARD_ID, () => Promise.reject(new BeforeError())),
      ).rejects.toBeInstanceOf(BeforeError);
      expect(work).not.toHaveBeenCalled();
    });

    it('throws BoardArchivedError before ListArchivedError and CardArchivedError', async () => {
      givenCard(buildArchivedCard(), {
        list: buildArchivedList(),
        board: buildBoard({ archivedAt: ARCHIVED_AT }),
      });

      await expect(write()).rejects.toBeInstanceOf(BoardArchivedError);
      expect(work).not.toHaveBeenCalled();
    });

    it('throws ListArchivedError before CardArchivedError', async () => {
      givenCard(buildArchivedCard(), { list: buildArchivedList() });

      await expect(write()).rejects.toBeInstanceOf(ListArchivedError);
      expect(work).not.toHaveBeenCalled();
    });

    it('throws CardArchivedError on an archived card', async () => {
      givenCard(buildArchivedCard());

      await expect(write()).rejects.toBeInstanceOf(CardArchivedError);
      expect(work).not.toHaveBeenCalled();
    });

    it('writes nothing on the card itself', async () => {
      givenCard(buildCard());

      await write();

      expectNoWrites();
    });
  });
});
