import type { Board } from '../../../src/boards/board.entity';
import {
  BoardArchivedError,
  BoardNotArchivedError,
  BoardNotFoundError,
} from '../../../src/boards/boards.errors';
import type { BoardsRepository } from '../../../src/boards/boards.repository';
import { BoardsService } from '../../../src/boards/boards.service';

const OWNER_ID = '7f3c2a8e-1b4d-4c6e-9a0f-2d5b8c1e7a90';
const BOARD_ID = '3b1e9d4a-6c2f-4e8b-a7d0-5f9c1b2e8a64';
const ARCHIVED_AT = new Date('2026-10-16T09:00:00Z');

type BoardsRepositoryMock = jest.Mocked<
  Pick<
    BoardsRepository,
    'create' | 'findOwned' | 'listOwned' | 'save' | 'deleteOwned'
  >
>;

function buildBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: BOARD_ID,
    ownerId: OWNER_ID,
    title: 'Roadmap',
    description: 'Q4 plans',
    archivedAt: null,
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
    ...overrides,
  };
}

describe('BoardsService', () => {
  let boards: BoardsRepositoryMock;
  let service: BoardsService;

  beforeEach(() => {
    boards = {
      create: jest.fn(),
      findOwned: jest.fn(),
      listOwned: jest.fn(),
      save: jest.fn((board: Board) => Promise.resolve(board)),
      deleteOwned: jest.fn(),
    };
    service = new BoardsService(boards as unknown as BoardsRepository);
  });

  describe('create', () => {
    it('stores the board for its owner and returns it', async () => {
      const board = buildBoard();
      boards.create.mockResolvedValue(board);

      const result = await service.create(OWNER_ID, {
        title: 'Roadmap',
        description: 'Q4 plans',
      });

      expect(boards.create).toHaveBeenCalledWith({
        ownerId: OWNER_ID,
        title: 'Roadmap',
        description: 'Q4 plans',
      });
      expect(result).toBe(board);
    });
  });

  describe('list', () => {
    it.each([false, true])(
      'returns the owner boards with archived %s',
      async (archived) => {
        const owned = [buildBoard()];
        boards.listOwned.mockResolvedValue(owned);

        const result = await service.list(OWNER_ID, archived);

        expect(boards.listOwned).toHaveBeenCalledWith(OWNER_ID, archived);
        expect(result).toBe(owned);
      },
    );
  });

  describe('findOwned', () => {
    it('returns the owned board', async () => {
      const board = buildBoard();
      boards.findOwned.mockResolvedValue(board);

      await expect(service.findOwned(OWNER_ID, BOARD_ID)).resolves.toBe(board);
      expect(boards.findOwned).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
    });

    it('throws BoardNotFoundError when no owned board matches', async () => {
      boards.findOwned.mockResolvedValue(null);

      await expect(
        service.findOwned(OWNER_ID, BOARD_ID),
      ).rejects.toBeInstanceOf(BoardNotFoundError);
    });

    it('throws BoardNotFoundError for a non-UUID id without querying', async () => {
      await expect(
        service.findOwned(OWNER_ID, 'not-a-uuid'),
      ).rejects.toBeInstanceOf(BoardNotFoundError);
      expect(boards.findOwned).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('changes only the title when only the title is present', async () => {
      boards.findOwned.mockResolvedValue(buildBoard());

      const result = await service.update(OWNER_ID, BOARD_ID, {
        title: 'Launch',
      });

      expect(result).toMatchObject({
        title: 'Launch',
        description: 'Q4 plans',
      });
      expect(boards.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Launch', description: 'Q4 plans' }),
      );
    });

    it('treats a key set to undefined as absent', async () => {
      boards.findOwned.mockResolvedValue(buildBoard());

      const result = await service.update(OWNER_ID, BOARD_ID, {
        title: 'Launch',
        description: undefined,
      });

      expect(result).toMatchObject({
        title: 'Launch',
        description: 'Q4 plans',
      });
    });

    it('clears the description when it is null', async () => {
      boards.findOwned.mockResolvedValue(buildBoard());

      const result = await service.update(OWNER_ID, BOARD_ID, {
        description: null,
      });

      expect(result).toMatchObject({ title: 'Roadmap', description: null });
      expect(boards.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Roadmap', description: null }),
      );
    });

    it('returns the board unchanged without saving for an empty change set', async () => {
      const board = buildBoard();
      boards.findOwned.mockResolvedValue(board);

      const result = await service.update(OWNER_ID, BOARD_ID, {});

      expect(result).toEqual(buildBoard());
      expect(boards.save).not.toHaveBeenCalled();
    });

    it('throws BoardArchivedError on an archived board without saving', async () => {
      boards.findOwned.mockResolvedValue(
        buildBoard({ archivedAt: ARCHIVED_AT }),
      );

      await expect(
        service.update(OWNER_ID, BOARD_ID, { title: 'Launch' }),
      ).rejects.toBeInstanceOf(BoardArchivedError);
      expect(boards.save).not.toHaveBeenCalled();
    });

    it('throws BoardNotFoundError for a board the owner does not have', async () => {
      boards.findOwned.mockResolvedValue(null);

      await expect(
        service.update(OWNER_ID, BOARD_ID, { title: 'Launch' }),
      ).rejects.toBeInstanceOf(BoardNotFoundError);
      expect(boards.save).not.toHaveBeenCalled();
    });
  });

  describe('archive', () => {
    it('sets archivedAt to the current time and saves an active board', async () => {
      boards.findOwned.mockResolvedValue(buildBoard());
      const before = Date.now();

      const result = await service.archive(OWNER_ID, BOARD_ID);

      expect(result.archivedAt).toBeInstanceOf(Date);
      expect(result.archivedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.archivedAt!.getTime()).toBeLessThanOrEqual(Date.now());
      expect(boards.save).toHaveBeenCalledWith(
        expect.objectContaining({ archivedAt: result.archivedAt }),
      );
    });

    it('returns an archived board with its original archivedAt without saving', async () => {
      boards.findOwned.mockResolvedValue(
        buildBoard({ archivedAt: ARCHIVED_AT }),
      );

      const result = await service.archive(OWNER_ID, BOARD_ID);

      expect(result).toEqual(buildBoard({ archivedAt: ARCHIVED_AT }));
      expect(boards.save).not.toHaveBeenCalled();
    });
  });

  describe('unarchive', () => {
    it('clears archivedAt and saves an archived board', async () => {
      boards.findOwned.mockResolvedValue(
        buildBoard({ archivedAt: ARCHIVED_AT }),
      );

      const result = await service.unarchive(OWNER_ID, BOARD_ID);

      expect(result.archivedAt).toBeNull();
      expect(boards.save).toHaveBeenCalledWith(
        expect.objectContaining({ archivedAt: null }),
      );
    });

    it('returns an active board unchanged without saving', async () => {
      boards.findOwned.mockResolvedValue(buildBoard());

      const result = await service.unarchive(OWNER_ID, BOARD_ID);

      expect(result).toEqual(buildBoard());
      expect(boards.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an archived board through the owner-scoped delete', async () => {
      boards.findOwned.mockResolvedValue(
        buildBoard({ archivedAt: ARCHIVED_AT }),
      );

      await service.remove(OWNER_ID, BOARD_ID);

      expect(boards.deleteOwned).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
    });

    it('throws BoardNotArchivedError on an active board without deleting', async () => {
      boards.findOwned.mockResolvedValue(buildBoard());

      await expect(service.remove(OWNER_ID, BOARD_ID)).rejects.toBeInstanceOf(
        BoardNotArchivedError,
      );
      expect(boards.deleteOwned).not.toHaveBeenCalled();
    });

    it('throws BoardNotFoundError for a malformed id without deleting', async () => {
      await expect(
        service.remove(OWNER_ID, 'not-a-uuid'),
      ).rejects.toBeInstanceOf(BoardNotFoundError);
      expect(boards.deleteOwned).not.toHaveBeenCalled();
    });
  });
});
