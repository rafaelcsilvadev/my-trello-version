import type { Board } from '../../../src/boards/board.entity';
import {
  BoardArchivedError,
  BoardNotFoundError,
} from '../../../src/boards/boards.errors';
import type { BoardsService } from '../../../src/boards/boards.service';
import type { List } from '../../../src/lists/list.entity';
import {
  ListArchivedError,
  ListNotArchivedError,
  ListNotFoundError,
} from '../../../src/lists/lists.errors';
import type { ListsRepository } from '../../../src/lists/lists.repository';
import { ListsService } from '../../../src/lists/lists.service';

const OWNER_ID = '7f3c2a8e-1b4d-4c6e-9a0f-2d5b8c1e7a90';
const BOARD_ID = '3b1e9d4a-6c2f-4e8b-a7d0-5f9c1b2e8a64';
const LIST_ID = 'c4a7e2d1-9b3f-4a6e-8d0c-1f5b7e9a2c38';
const ARCHIVED_AT = new Date('2026-10-16T09:00:00Z');

type ListsRepositoryMock = jest.Mocked<
  Pick<
    ListsRepository,
    | 'transaction'
    | 'lockOwnedBoard'
    | 'findOwned'
    | 'listInBoard'
    | 'countActive'
    | 'create'
    | 'shift'
    | 'save'
    | 'delete'
  >
>;

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
    position: 1,
    archivedAt: null,
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
    ...overrides,
  };
}

function buildArchivedList(overrides: Partial<List> = {}): List {
  return buildList({ position: null, archivedAt: ARCHIVED_AT, ...overrides });
}

describe('ListsService', () => {
  let lists: ListsRepositoryMock;
  let boards: BoardsServiceMock;
  let service: ListsService;

  // Every write path either changes or deletes a list; none of them may run
  // when a guard rejects the call.
  function expectNoWrites(): void {
    expect(lists.create).not.toHaveBeenCalled();
    expect(lists.shift).not.toHaveBeenCalled();
    expect(lists.save).not.toHaveBeenCalled();
    expect(lists.delete).not.toHaveBeenCalled();
  }

  // findOwned answers both the lookup before the transaction and the
  // re-read under the board lock.
  function givenList(list: List, activeCount = 4): void {
    lists.findOwned.mockResolvedValue(list);
    lists.lockOwnedBoard.mockResolvedValue(buildBoard());
    lists.countActive.mockResolvedValue(activeCount);
  }

  beforeEach(() => {
    lists = {
      transaction: jest.fn(),
      lockOwnedBoard: jest.fn(),
      findOwned: jest.fn(),
      listInBoard: jest.fn(),
      countActive: jest.fn(),
      create: jest.fn(),
      shift: jest.fn(),
      save: jest.fn((list: List) => Promise.resolve(list)),
      delete: jest.fn(),
    };
    lists.transaction.mockImplementation((work) =>
      work(lists as unknown as ListsRepository),
    );
    boards = { findOwned: jest.fn() };
    service = new ListsService(
      lists as unknown as ListsRepository,
      boards as unknown as BoardsService,
    );
  });

  describe('create', () => {
    it('creates the list at the end of the active lists under the board lock', async () => {
      const created = buildList({ position: 3 });
      lists.lockOwnedBoard.mockResolvedValue(buildBoard());
      lists.countActive.mockResolvedValue(3);
      lists.create.mockResolvedValue(created);

      const result = await service.create(OWNER_ID, BOARD_ID, 'To do');

      expect(lists.transaction).toHaveBeenCalled();
      expect(lists.lockOwnedBoard).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
      expect(lists.countActive).toHaveBeenCalledWith(BOARD_ID);
      expect(lists.create).toHaveBeenCalledWith({
        boardId: BOARD_ID,
        title: 'To do',
        position: 3,
      });
      expect(result).toBe(created);
    });

    it('creates the first list of a board at position 0', async () => {
      lists.lockOwnedBoard.mockResolvedValue(buildBoard());
      lists.countActive.mockResolvedValue(0);

      await service.create(OWNER_ID, BOARD_ID, 'To do');

      expect(lists.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 0 }),
      );
    });

    it('throws BoardNotFoundError when the owner has no such board', async () => {
      lists.lockOwnedBoard.mockResolvedValue(null);

      await expect(
        service.create(OWNER_ID, BOARD_ID, 'To do'),
      ).rejects.toBeInstanceOf(BoardNotFoundError);
      expectNoWrites();
    });

    it('throws BoardNotFoundError for a non-UUID board id without querying', async () => {
      await expect(
        service.create(OWNER_ID, 'not-a-uuid', 'To do'),
      ).rejects.toBeInstanceOf(BoardNotFoundError);
      expect(lists.lockOwnedBoard).not.toHaveBeenCalled();
      expectNoWrites();
    });

    it('throws BoardArchivedError on an archived board without creating', async () => {
      lists.lockOwnedBoard.mockResolvedValue(
        buildBoard({ archivedAt: ARCHIVED_AT }),
      );

      await expect(
        service.create(OWNER_ID, BOARD_ID, 'To do'),
      ).rejects.toBeInstanceOf(BoardArchivedError);
      expectNoWrites();
    });
  });

  describe('listInBoard', () => {
    it.each([false, true])(
      'checks the board, then returns its lists with archived %s',
      async (archived) => {
        const inBoard = [buildList()];
        boards.findOwned.mockResolvedValue(buildBoard());
        lists.listInBoard.mockResolvedValue(inBoard);

        const result = await service.listInBoard(OWNER_ID, BOARD_ID, archived);

        expect(boards.findOwned).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
        expect(lists.listInBoard).toHaveBeenCalledWith(BOARD_ID, archived);
        expect(result).toBe(inBoard);
      },
    );

    it('lists the lists of an archived board', async () => {
      boards.findOwned.mockResolvedValue(
        buildBoard({ archivedAt: ARCHIVED_AT }),
      );
      lists.listInBoard.mockResolvedValue([]);

      await expect(
        service.listInBoard(OWNER_ID, BOARD_ID, false),
      ).resolves.toEqual([]);
    });

    it('propagates BoardNotFoundError without listing', async () => {
      boards.findOwned.mockRejectedValue(new BoardNotFoundError());

      await expect(
        service.listInBoard(OWNER_ID, BOARD_ID, false),
      ).rejects.toBeInstanceOf(BoardNotFoundError);
      expect(lists.listInBoard).not.toHaveBeenCalled();
    });
  });

  describe('findOwned', () => {
    it('returns the owned list', async () => {
      const list = buildList();
      lists.findOwned.mockResolvedValue(list);

      await expect(service.findOwned(OWNER_ID, LIST_ID)).resolves.toBe(list);
      expect(lists.findOwned).toHaveBeenCalledWith(OWNER_ID, LIST_ID);
    });

    it('throws ListNotFoundError when no owned list matches', async () => {
      lists.findOwned.mockResolvedValue(null);

      await expect(service.findOwned(OWNER_ID, LIST_ID)).rejects.toBeInstanceOf(
        ListNotFoundError,
      );
    });

    it('throws ListNotFoundError for a non-UUID id without querying', async () => {
      await expect(
        service.findOwned(OWNER_ID, 'not-a-uuid'),
      ).rejects.toBeInstanceOf(ListNotFoundError);
      expect(lists.findOwned).not.toHaveBeenCalled();
    });
  });

  // Shared item-write flow: lookup → board lock → re-read → guards.
  describe.each<[string, (s: ListsService, id: string) => Promise<unknown>]>([
    ['update', (s, id) => s.update(OWNER_ID, id, { title: 'Doing' })],
    ['move', (s, id) => s.move(OWNER_ID, id, 0)],
    ['archive', (s, id) => s.archive(OWNER_ID, id)],
    ['unarchive', (s, id) => s.unarchive(OWNER_ID, id)],
    ['remove', (s, id) => s.remove(OWNER_ID, id)],
  ])('%s guards', (_name, call) => {
    it('throws ListNotFoundError for a non-UUID id without querying', async () => {
      await expect(call(service, 'not-a-uuid')).rejects.toBeInstanceOf(
        ListNotFoundError,
      );
      expect(lists.findOwned).not.toHaveBeenCalled();
      expectNoWrites();
    });

    it('throws ListNotFoundError when the owner has no such list', async () => {
      lists.findOwned.mockResolvedValue(null);

      await expect(call(service, LIST_ID)).rejects.toBeInstanceOf(
        ListNotFoundError,
      );
      expectNoWrites();
    });

    it('locks the list board and throws ListNotFoundError when the board is gone', async () => {
      lists.findOwned.mockResolvedValue(buildList());
      lists.lockOwnedBoard.mockResolvedValue(null);

      await expect(call(service, LIST_ID)).rejects.toBeInstanceOf(
        ListNotFoundError,
      );
      expect(lists.lockOwnedBoard).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
      expectNoWrites();
    });

    it('throws ListNotFoundError when the list is gone under the lock', async () => {
      lists.findOwned
        .mockResolvedValueOnce(buildList())
        .mockResolvedValue(null);
      lists.lockOwnedBoard.mockResolvedValue(buildBoard());

      await expect(call(service, LIST_ID)).rejects.toBeInstanceOf(
        ListNotFoundError,
      );
      expectNoWrites();
    });

    it.each([
      ['an active list', buildList()],
      ['an archived list', buildArchivedList()],
    ])(
      'throws BoardArchivedError on %s of an archived board without writing',
      async (_state, list) => {
        lists.findOwned.mockResolvedValue(list);
        lists.lockOwnedBoard.mockResolvedValue(
          buildBoard({ archivedAt: ARCHIVED_AT }),
        );

        await expect(call(service, LIST_ID)).rejects.toBeInstanceOf(
          BoardArchivedError,
        );
        expectNoWrites();
      },
    );
  });

  describe('update', () => {
    it('saves the new title under the board lock', async () => {
      givenList(buildList());

      const result = await service.update(OWNER_ID, LIST_ID, {
        title: 'Doing',
      });

      expect(lists.transaction).toHaveBeenCalled();
      expect(result.title).toBe('Doing');
      expect(lists.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Doing', position: 1 }),
      );
    });

    it('returns the list unchanged without saving for an empty change set', async () => {
      givenList(buildList());

      const result = await service.update(OWNER_ID, LIST_ID, {});

      expect(result).toEqual(buildList());
      expect(lists.save).not.toHaveBeenCalled();
    });

    it('treats a title set to undefined as absent', async () => {
      givenList(buildList());

      const result = await service.update(OWNER_ID, LIST_ID, {
        title: undefined,
      });

      expect(result).toEqual(buildList());
      expect(lists.save).not.toHaveBeenCalled();
    });

    it('throws ListArchivedError on an archived list without saving', async () => {
      givenList(buildArchivedList());

      await expect(
        service.update(OWNER_ID, LIST_ID, { title: 'Doing' }),
      ).rejects.toBeInstanceOf(ListArchivedError);
      expectNoWrites();
    });
  });

  describe('move', () => {
    // Board of 4 active lists (positions 0..3); the moved list sits at 1.
    it('shifts [k, i-1] by +1 when moving up', async () => {
      givenList(buildList({ position: 3 }));

      const result = await service.move(OWNER_ID, LIST_ID, 0);

      expect(lists.shift).toHaveBeenCalledWith(BOARD_ID, 0, 2, 1);
      expect(result.position).toBe(0);
      expect(lists.save).toHaveBeenCalledWith(
        expect.objectContaining({ position: 0 }),
      );
    });

    it('shifts [i+1, k] by -1 when moving down', async () => {
      givenList(buildList({ position: 0 }));

      const result = await service.move(OWNER_ID, LIST_ID, 2);

      expect(lists.shift).toHaveBeenCalledWith(BOARD_ID, 1, 2, -1);
      expect(result.position).toBe(2);
    });

    it('shifts before saving so the deferred unique check sees one final state', async () => {
      givenList(buildList({ position: 3 }));

      await service.move(OWNER_ID, LIST_ID, 0);

      expect(lists.shift.mock.invocationCallOrder[0]).toBeLessThan(
        lists.save.mock.invocationCallOrder[0],
      );
    });

    it('clamps a position past the end to the last index', async () => {
      givenList(buildList({ position: 1 }));

      const result = await service.move(OWNER_ID, LIST_ID, 99);

      expect(lists.shift).toHaveBeenCalledWith(BOARD_ID, 2, 3, -1);
      expect(result.position).toBe(3);
    });

    it('keeps the only list at position 0 for any target', async () => {
      givenList(buildList({ position: 0 }), 1);

      const result = await service.move(OWNER_ID, LIST_ID, 5);

      expect(result).toEqual(buildList({ position: 0 }));
      expect(lists.shift).not.toHaveBeenCalled();
      expect(lists.save).not.toHaveBeenCalled();
    });

    it('returns the list without shifting or saving for its own position', async () => {
      givenList(buildList({ position: 1 }));

      const result = await service.move(OWNER_ID, LIST_ID, 1);

      expect(result).toEqual(buildList({ position: 1 }));
      expectNoWrites();
    });

    it('returns the last list without writing when clamped to its own position', async () => {
      givenList(buildList({ position: 3 }));

      await service.move(OWNER_ID, LIST_ID, 10);

      expectNoWrites();
    });

    it('throws ListArchivedError on an archived list without writing', async () => {
      givenList(buildArchivedList());

      await expect(service.move(OWNER_ID, LIST_ID, 0)).rejects.toBeInstanceOf(
        ListArchivedError,
      );
      expectNoWrites();
    });
  });

  describe('archive', () => {
    it('closes the gap and archives the list now', async () => {
      givenList(buildList({ position: 1 }));
      const before = Date.now();

      const result = await service.archive(OWNER_ID, LIST_ID);

      expect(lists.shift).toHaveBeenCalledWith(BOARD_ID, 2, 3, -1);
      expect(result.position).toBeNull();
      expect(result.archivedAt).toBeInstanceOf(Date);
      expect(result.archivedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.archivedAt!.getTime()).toBeLessThanOrEqual(Date.now());
      expect(lists.save).toHaveBeenCalledWith(
        expect.objectContaining({
          position: null,
          archivedAt: result.archivedAt,
        }),
      );
    });

    it('shifts nothing when archiving the last list', async () => {
      givenList(buildList({ position: 3 }));

      const result = await service.archive(OWNER_ID, LIST_ID);

      expect(lists.shift).not.toHaveBeenCalled();
      expect(result.position).toBeNull();
      expect(lists.save).toHaveBeenCalled();
    });

    it('returns an archived list with its original archivedAt without writing', async () => {
      givenList(buildArchivedList());

      const result = await service.archive(OWNER_ID, LIST_ID);

      expect(result).toEqual(buildArchivedList());
      expectNoWrites();
    });
  });

  describe('unarchive', () => {
    it('puts the list back at the end of the active lists', async () => {
      givenList(buildArchivedList(), 3);

      const result = await service.unarchive(OWNER_ID, LIST_ID);

      expect(lists.countActive).toHaveBeenCalledWith(BOARD_ID);
      expect(result).toMatchObject({ position: 3, archivedAt: null });
      expect(lists.save).toHaveBeenCalledWith(
        expect.objectContaining({ position: 3, archivedAt: null }),
      );
      expect(lists.shift).not.toHaveBeenCalled();
    });

    it('returns an active list unchanged without writing', async () => {
      givenList(buildList());

      const result = await service.unarchive(OWNER_ID, LIST_ID);

      expect(result).toEqual(buildList());
      expectNoWrites();
    });
  });

  describe('remove', () => {
    it('deletes an archived list without shifting', async () => {
      givenList(buildArchivedList());

      await service.remove(OWNER_ID, LIST_ID);

      expect(lists.delete).toHaveBeenCalledWith(LIST_ID);
      expect(lists.shift).not.toHaveBeenCalled();
    });

    it('throws ListNotArchivedError on an active list without deleting', async () => {
      givenList(buildList());

      await expect(service.remove(OWNER_ID, LIST_ID)).rejects.toBeInstanceOf(
        ListNotArchivedError,
      );
      expectNoWrites();
    });
  });
});
