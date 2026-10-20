import type { Board } from '../../../src/boards/board.entity';
import {
  BoardArchivedError,
  BoardNotFoundError,
} from '../../../src/boards/boards.errors';
import type { BoardsService } from '../../../src/boards/boards.service';
import type { Label } from '../../../src/labels/label.entity';
import {
  LabelNameTakenError,
  LabelNotFoundError,
} from '../../../src/labels/labels.errors';
import type { LabelsRepository } from '../../../src/labels/labels.repository';
import { LabelsService } from '../../../src/labels/labels.service';

const OWNER_ID = '7f3c2a8e-1b4d-4c6e-9a0f-2d5b8c1e7a90';
const BOARD_ID = '3b1e9d4a-6c2f-4e8b-a7d0-5f9c1b2e8a64';
const LABEL_ID = 'e8d2c4b6-3a1f-4d9e-b7c5-0a2f6e8d4c13';
const ARCHIVED_AT = new Date('2026-10-16T09:00:00Z');

type LabelsRepositoryMock = jest.Mocked<
  Pick<
    LabelsRepository,
    | 'transaction'
    | 'lockOwnedBoard'
    | 'findOwned'
    | 'listInBoard'
    | 'create'
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

function buildLabel(overrides: Partial<Label> = {}): Label {
  return {
    id: LABEL_ID,
    boardId: BOARD_ID,
    name: 'Bug',
    color: 'red',
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
    ...overrides,
  };
}

describe('LabelsService', () => {
  let labels: LabelsRepositoryMock;
  let boards: BoardsServiceMock;
  let service: LabelsService;

  function expectNoWrites(): void {
    expect(labels.create).not.toHaveBeenCalled();
    expect(labels.save).not.toHaveBeenCalled();
    expect(labels.delete).not.toHaveBeenCalled();
  }

  // findOwned answers both the lookup before the transaction and the
  // re-read under the board lock.
  function givenLabel(label: Label, board: Board = buildBoard()): void {
    labels.findOwned.mockResolvedValue(label);
    labels.lockOwnedBoard.mockResolvedValue(board);
  }

  beforeEach(() => {
    labels = {
      transaction: jest.fn(),
      lockOwnedBoard: jest.fn(),
      findOwned: jest.fn(),
      listInBoard: jest.fn(),
      create: jest.fn(),
      save: jest.fn((label: Label) => Promise.resolve(label)),
      delete: jest.fn(),
    };
    labels.transaction.mockImplementation((work) =>
      work(labels as unknown as LabelsRepository),
    );
    boards = { findOwned: jest.fn() };
    service = new LabelsService(
      labels as unknown as LabelsRepository,
      boards as unknown as BoardsService,
    );
  });

  describe('create', () => {
    it('creates the label under the board lock and returns it', async () => {
      const created = buildLabel();
      labels.lockOwnedBoard.mockResolvedValue(buildBoard());
      labels.create.mockResolvedValue(created);

      const result = await service.create(OWNER_ID, BOARD_ID, {
        name: 'Bug',
        color: 'red',
      });

      expect(labels.transaction).toHaveBeenCalled();
      expect(labels.lockOwnedBoard).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
      expect(labels.create).toHaveBeenCalledWith({
        boardId: BOARD_ID,
        name: 'Bug',
        color: 'red',
      });
      expect(result).toBe(created);
    });

    it('rejects a malformed board id without touching the repository', async () => {
      await expect(
        service.create(OWNER_ID, 'not-a-uuid', { name: 'Bug', color: 'red' }),
      ).rejects.toBeInstanceOf(BoardNotFoundError);

      expect(labels.transaction).not.toHaveBeenCalled();
      expect(labels.lockOwnedBoard).not.toHaveBeenCalled();
    });

    it('rejects an unknown or foreign board', async () => {
      labels.lockOwnedBoard.mockResolvedValue(null);

      await expect(
        service.create(OWNER_ID, BOARD_ID, { name: 'Bug', color: 'red' }),
      ).rejects.toBeInstanceOf(BoardNotFoundError);

      expectNoWrites();
    });

    it('rejects an archived board', async () => {
      labels.lockOwnedBoard.mockResolvedValue(
        buildBoard({ archivedAt: ARCHIVED_AT }),
      );

      await expect(
        service.create(OWNER_ID, BOARD_ID, { name: 'Bug', color: 'red' }),
      ).rejects.toBeInstanceOf(BoardArchivedError);

      expectNoWrites();
    });

    it('propagates a name clash from the repository', async () => {
      labels.lockOwnedBoard.mockResolvedValue(buildBoard());
      labels.create.mockRejectedValue(new LabelNameTakenError());

      await expect(
        service.create(OWNER_ID, BOARD_ID, { name: 'Bug', color: 'red' }),
      ).rejects.toBeInstanceOf(LabelNameTakenError);
    });
  });

  describe('listInBoard', () => {
    it('checks board access then lists its labels', async () => {
      const found = [buildLabel()];
      boards.findOwned.mockResolvedValue(buildBoard());
      labels.listInBoard.mockResolvedValue(found);

      const result = await service.listInBoard(OWNER_ID, BOARD_ID);

      expect(boards.findOwned).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
      expect(labels.listInBoard).toHaveBeenCalledWith(BOARD_ID);
      expect(result).toBe(found);
    });

    it('lists the labels of an archived board', async () => {
      const found = [buildLabel()];
      boards.findOwned.mockResolvedValue(
        buildBoard({ archivedAt: ARCHIVED_AT }),
      );
      labels.listInBoard.mockResolvedValue(found);

      await expect(service.listInBoard(OWNER_ID, BOARD_ID)).resolves.toBe(
        found,
      );
      expect(labels.transaction).not.toHaveBeenCalled();
    });

    it('propagates BoardNotFoundError without listing', async () => {
      boards.findOwned.mockRejectedValue(new BoardNotFoundError());

      await expect(
        service.listInBoard(OWNER_ID, BOARD_ID),
      ).rejects.toBeInstanceOf(BoardNotFoundError);
      expect(labels.listInBoard).not.toHaveBeenCalled();
    });
  });

  // update and remove share writeLocked, so both run through its guards.
  describe.each<[string, (s: LabelsService, id: string) => Promise<unknown>]>([
    ['update', (s, id) => s.update(OWNER_ID, id, { name: 'Feature' })],
    ['remove', (s, id) => s.remove(OWNER_ID, id)],
  ])('%s guards', (_name, call) => {
    it('rejects a malformed id without touching the repository', async () => {
      await expect(call(service, 'not-a-uuid')).rejects.toBeInstanceOf(
        LabelNotFoundError,
      );

      expect(labels.findOwned).not.toHaveBeenCalled();
      expect(labels.transaction).not.toHaveBeenCalled();
    });

    it('rejects an unknown or foreign label', async () => {
      labels.findOwned.mockResolvedValue(null);

      await expect(call(service, LABEL_ID)).rejects.toBeInstanceOf(
        LabelNotFoundError,
      );

      expect(labels.transaction).not.toHaveBeenCalled();
    });

    it('rejects a label deleted before the re-read under the lock', async () => {
      labels.findOwned
        .mockResolvedValueOnce(buildLabel())
        .mockResolvedValueOnce(null);
      labels.lockOwnedBoard.mockResolvedValue(buildBoard());

      await expect(call(service, LABEL_ID)).rejects.toBeInstanceOf(
        LabelNotFoundError,
      );

      expectNoWrites();
    });

    it('rejects a label whose board was deleted before the lock', async () => {
      labels.findOwned.mockResolvedValue(buildLabel());
      labels.lockOwnedBoard.mockResolvedValue(null);

      await expect(call(service, LABEL_ID)).rejects.toBeInstanceOf(
        LabelNotFoundError,
      );

      expectNoWrites();
    });

    it('rejects a label of an archived board', async () => {
      givenLabel(buildLabel(), buildBoard({ archivedAt: ARCHIVED_AT }));

      await expect(call(service, LABEL_ID)).rejects.toBeInstanceOf(
        BoardArchivedError,
      );

      expectNoWrites();
    });

    it('locks the board of the label', async () => {
      givenLabel(buildLabel());

      await call(service, LABEL_ID);

      expect(labels.lockOwnedBoard).toHaveBeenCalledWith(OWNER_ID, BOARD_ID);
      expect(labels.findOwned).toHaveBeenCalledTimes(2);
    });
  });

  describe('update', () => {
    it('returns the label unsaved for empty changes', async () => {
      const label = buildLabel();
      givenLabel(label);

      await expect(service.update(OWNER_ID, LABEL_ID, {})).resolves.toBe(label);

      expect(labels.save).not.toHaveBeenCalled();
    });

    it('saves a new name and keeps the color', async () => {
      givenLabel(buildLabel());

      const result = await service.update(OWNER_ID, LABEL_ID, {
        name: 'Feature',
      });

      expect(labels.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Feature', color: 'red' }),
      );
      expect(result).toMatchObject({ name: 'Feature', color: 'red' });
    });

    it('saves a new color and keeps the name', async () => {
      givenLabel(buildLabel());

      await service.update(OWNER_ID, LABEL_ID, { color: 'blue' });

      expect(labels.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Bug', color: 'blue' }),
      );
    });

    it('saves both fields at once', async () => {
      givenLabel(buildLabel());

      await service.update(OWNER_ID, LABEL_ID, {
        name: 'Feature',
        color: 'green',
      });

      expect(labels.save).toHaveBeenCalledTimes(1);
      expect(labels.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Feature', color: 'green' }),
      );
    });

    it('propagates a name clash from the repository', async () => {
      givenLabel(buildLabel());
      labels.save.mockRejectedValue(new LabelNameTakenError());

      await expect(
        service.update(OWNER_ID, LABEL_ID, { name: 'Feature' }),
      ).rejects.toBeInstanceOf(LabelNameTakenError);
    });
  });

  describe('remove', () => {
    it('deletes the label once', async () => {
      givenLabel(buildLabel());

      await expect(service.remove(OWNER_ID, LABEL_ID)).resolves.toBeUndefined();

      expect(labels.delete).toHaveBeenCalledTimes(1);
      expect(labels.delete).toHaveBeenCalledWith(LABEL_ID);
    });
  });
});
