import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Board } from './board.entity';
import {
  BoardArchivedError,
  BoardNotArchivedError,
  BoardNotFoundError,
} from './boards.errors';
import { BoardsRepository } from './boards.repository';

export type CreateBoardChanges = Pick<Board, 'title' | 'description'>;

export type UpdateBoardChanges = Partial<CreateBoardChanges>;

@Injectable()
export class BoardsService {
  constructor(private readonly boardsRepository: BoardsRepository) {}

  create(
    ownerId: string,
    { title, description }: CreateBoardChanges,
  ): Promise<Board> {
    return this.boardsRepository.create({ ownerId, title, description });
  }

  list(ownerId: string, archived: boolean): Promise<Board[]> {
    return this.boardsRepository.listOwned(ownerId, archived);
  }

  // A malformed id is answered like a missing one and never reaches
  // PostgreSQL, which would reject it as an invalid uuid (BRD-21).
  async findOwned(ownerId: string, id: string): Promise<Board> {
    const board = isUUID(id)
      ? await this.boardsRepository.findOwned(ownerId, id)
      : null;

    if (!board) {
      throw new BoardNotFoundError();
    }

    return board;
  }

  async update(
    ownerId: string,
    id: string,
    changes: UpdateBoardChanges,
  ): Promise<Board> {
    const board = await this.findOwned(ownerId, id);

    if (board.archivedAt) {
      throw new BoardArchivedError();
    }

    const present = Object.entries(changes).filter(
      ([, value]) => value !== undefined,
    );

    // Saving would bump updatedAt, so an empty PATCH leaves the row alone
    // (BRD-13).
    if (present.length === 0) {
      return board;
    }

    return this.boardsRepository.save(
      Object.assign(board, Object.fromEntries(present)),
    );
  }

  async archive(ownerId: string, id: string): Promise<Board> {
    const board = await this.findOwned(ownerId, id);

    if (board.archivedAt) {
      return board;
    }

    board.archivedAt = new Date();
    return this.boardsRepository.save(board);
  }

  async unarchive(ownerId: string, id: string): Promise<Board> {
    const board = await this.findOwned(ownerId, id);

    if (!board.archivedAt) {
      return board;
    }

    board.archivedAt = null;
    return this.boardsRepository.save(board);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const board = await this.findOwned(ownerId, id);

    if (!board.archivedAt) {
      throw new BoardNotArchivedError();
    }

    await this.boardsRepository.deleteOwned(ownerId, id);
  }
}
