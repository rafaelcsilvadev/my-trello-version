import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import {
  BoardArchivedError,
  BoardNotFoundError,
} from '../boards/boards.errors';
import { BoardsService } from '../boards/boards.service';
import type { List } from './list.entity';
import {
  ListArchivedError,
  ListNotArchivedError,
  ListNotFoundError,
} from './lists.errors';
import { ListsRepository } from './lists.repository';

export type UpdateListChanges = Partial<Pick<List, 'title'>>;

// Active lists of a board hold positions 0..n-1 (BE-AD-009). Every write
// runs under the board row lock, so it reads and leaves a contiguous set.
@Injectable()
export class ListsService {
  constructor(
    private readonly listsRepository: ListsRepository,
    private readonly boardsService: BoardsService,
  ) {}

  create(ownerId: string, boardId: string, title: string): Promise<List> {
    // A malformed id never reaches PostgreSQL, which would reject it as an
    // invalid uuid (LST-04).
    if (!isUUID(boardId)) {
      return Promise.reject(new BoardNotFoundError());
    }

    return this.listsRepository.transaction(async (lists) => {
      const board = await lists.lockOwnedBoard(ownerId, boardId);

      if (!board) {
        throw new BoardNotFoundError();
      }

      if (board.archivedAt) {
        throw new BoardArchivedError();
      }

      const position = await lists.countActive(boardId);
      return lists.create({ boardId, title, position });
    });
  }

  // Reads skip the lock: lists of an archived board stay readable.
  async listInBoard(
    ownerId: string,
    boardId: string,
    archived: boolean,
  ): Promise<List[]> {
    await this.boardsService.findOwned(ownerId, boardId);
    return this.listsRepository.listInBoard(boardId, archived);
  }

  async findOwned(ownerId: string, id: string): Promise<List> {
    const list = isUUID(id)
      ? await this.listsRepository.findOwned(ownerId, id)
      : null;

    if (!list) {
      throw new ListNotFoundError();
    }

    return list;
  }

  update(
    ownerId: string,
    id: string,
    changes: UpdateListChanges,
  ): Promise<List> {
    return this.writeLocked(ownerId, id, (list, lists) => {
      if (list.archivedAt) {
        throw new ListArchivedError();
      }

      // Saving would bump updatedAt, so an empty PATCH leaves the row alone
      // (LST-12).
      if (changes.title === undefined) {
        return Promise.resolve(list);
      }

      list.title = changes.title;
      return lists.save(list);
    });
  }

  move(ownerId: string, id: string, position: number): Promise<List> {
    return this.writeLocked(ownerId, id, async (list, lists) => {
      if (list.archivedAt || list.position === null) {
        throw new ListArchivedError();
      }

      const from = list.position;
      const to = Math.min(
        position,
        (await lists.countActive(list.boardId)) - 1,
      );

      if (to === from) {
        return list;
      }

      // Shifts first: the deferred unique constraint only checks the final
      // state at commit, so the temporary duplicate is fine.
      if (to < from) {
        await lists.shift(list.boardId, to, from - 1, 1);
      } else {
        await lists.shift(list.boardId, from + 1, to, -1);
      }

      list.position = to;
      return lists.save(list);
    });
  }

  archive(ownerId: string, id: string): Promise<List> {
    return this.writeLocked(ownerId, id, async (list, lists) => {
      if (list.archivedAt || list.position === null) {
        return list;
      }

      const last = (await lists.countActive(list.boardId)) - 1;

      if (list.position < last) {
        await lists.shift(list.boardId, list.position + 1, last, -1);
      }

      list.position = null;
      list.archivedAt = new Date();
      return lists.save(list);
    });
  }

  unarchive(ownerId: string, id: string): Promise<List> {
    return this.writeLocked(ownerId, id, async (list, lists) => {
      if (!list.archivedAt) {
        return list;
      }

      list.position = await lists.countActive(list.boardId);
      list.archivedAt = null;
      return lists.save(list);
    });
  }

  async remove(ownerId: string, id: string): Promise<void> {
    // An archived list holds no position, so deleting it shifts nothing.
    await this.writeLocked(ownerId, id, async (list, lists) => {
      if (!list.archivedAt) {
        throw new ListNotArchivedError();
      }

      await lists.delete(list.id);
    });
  }

  // Item write flow: find the list's board, lock it, re-read the list under
  // the lock, then guard in precedence order: list not found, board
  // archived, then the list state checks inside work.
  private async writeLocked<T>(
    ownerId: string,
    id: string,
    work: (list: List, lists: ListsRepository) => Promise<T>,
  ): Promise<T> {
    const { boardId } = await this.findOwned(ownerId, id);

    return this.listsRepository.transaction(async (lists) => {
      const board = await lists.lockOwnedBoard(ownerId, boardId);
      const list = board ? await lists.findOwned(ownerId, id) : null;

      // The board, or the list alone, was deleted since the lookup.
      if (!board || !list) {
        throw new ListNotFoundError();
      }

      if (board.archivedAt) {
        throw new BoardArchivedError();
      }

      return work(list, lists);
    });
  }
}
