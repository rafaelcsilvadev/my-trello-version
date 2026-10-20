import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import {
  BoardArchivedError,
  BoardNotFoundError,
} from '../boards/boards.errors';
import { BoardsService } from '../boards/boards.service';
import type { Label } from './label.entity';
import { LabelNotFoundError } from './labels.errors';
import { LabelsRepository } from './labels.repository';

export type CreateLabelFields = Pick<Label, 'name' | 'color'>;
export type UpdateLabelChanges = Partial<CreateLabelFields>;

// Every label write runs under the board row lock (BE-AD-010), so the
// archived-board check sees the committed state (LBL-07). Name uniqueness is
// left to the repository's unique index (LBL-31).
@Injectable()
export class LabelsService {
  constructor(
    private readonly labelsRepository: LabelsRepository,
    private readonly boardsService: BoardsService,
  ) {}

  create(
    ownerId: string,
    boardId: string,
    { name, color }: CreateLabelFields,
  ): Promise<Label> {
    // A malformed id never reaches PostgreSQL, which would reject it as an
    // invalid uuid.
    if (!isUUID(boardId)) {
      return Promise.reject(new BoardNotFoundError());
    }

    return this.labelsRepository.transaction(async (labels) => {
      const board = await labels.lockOwnedBoard(ownerId, boardId);

      if (!board) {
        throw new BoardNotFoundError();
      }

      if (board.archivedAt) {
        throw new BoardArchivedError();
      }

      return labels.create({ boardId, name, color });
    });
  }

  // Reads skip the lock: labels of an archived board stay readable (LBL-09).
  async listInBoard(ownerId: string, boardId: string): Promise<Label[]> {
    await this.boardsService.findOwned(ownerId, boardId);
    return this.labelsRepository.listInBoard(boardId);
  }

  update(
    ownerId: string,
    id: string,
    changes: UpdateLabelChanges,
  ): Promise<Label> {
    return this.writeLocked(ownerId, id, (label, labels) => {
      // Saving would bump updatedAt, so an empty PATCH leaves the row alone
      // (LBL-15).
      if (changes.name === undefined && changes.color === undefined) {
        return Promise.resolve(label);
      }

      if (changes.name !== undefined) {
        label.name = changes.name;
      }

      if (changes.color !== undefined) {
        label.color = changes.color;
      }

      return labels.save(label);
    });
  }

  // Card links go with the label through ON DELETE CASCADE (LBL-17).
  async remove(ownerId: string, id: string): Promise<void> {
    await this.writeLocked(ownerId, id, (label, labels) =>
      labels.delete(label.id),
    );
  }

  // Item write flow: find the label's board, lock it, re-read the label
  // under the lock, then guard in precedence order: label not found, board
  // archived.
  private async writeLocked<T>(
    ownerId: string,
    id: string,
    work: (label: Label, labels: LabelsRepository) => Promise<T>,
  ): Promise<T> {
    const found = isUUID(id)
      ? await this.labelsRepository.findOwned(ownerId, id)
      : null;

    if (!found) {
      throw new LabelNotFoundError();
    }

    return this.labelsRepository.transaction(async (labels) => {
      const board = await labels.lockOwnedBoard(ownerId, found.boardId);
      const label = board ? await labels.findOwned(ownerId, id) : null;

      // The board, or the label alone, was deleted since the lookup.
      if (!board || !label) {
        throw new LabelNotFoundError();
      }

      if (board.archivedAt) {
        throw new BoardArchivedError();
      }

      return work(label, labels);
    });
  }
}
