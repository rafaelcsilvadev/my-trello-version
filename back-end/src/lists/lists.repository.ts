import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Board } from '../boards/board.entity';
import { lockOwnedBoard } from '../boards/board-lock';
import { List } from './list.entity';

export type CreateListInput = Pick<List, 'boardId' | 'title'> & {
  position: number;
};

// Lists have no owner column: reads by id are scoped through the board's
// owner (BE-AD-008). Methods taking a boardId expect a board already checked
// (findOwned on BoardsService or lockOwnedBoard), and save/delete a list
// already loaded through findOwned.
@Injectable()
export class ListsRepository {
  constructor(
    @InjectRepository(List) private readonly lists: Repository<List>,
  ) {}

  // Runs work with a repository bound to one transaction; any throw rolls
  // back every write made through it.
  transaction<T>(work: (lists: ListsRepository) => Promise<T>): Promise<T> {
    return this.lists.manager.transaction((manager) =>
      work(new ListsRepository(manager.getRepository(List))),
    );
  }

  // Only valid inside transaction().
  lockOwnedBoard(ownerId: string, boardId: string): Promise<Board | null> {
    return lockOwnedBoard(this.lists.manager, ownerId, boardId);
  }

  findOwned(ownerId: string, id: string): Promise<List | null> {
    return this.lists
      .createQueryBuilder('list')
      .innerJoin(Board, 'board', 'board.id = list.boardId')
      .where('list.id = :id', { id })
      .andWhere('board.ownerId = :ownerId', { ownerId })
      .getOne();
  }

  listInBoard(boardId: string, archived: boolean): Promise<List[]> {
    return this.lists.find({
      where: { boardId, archivedAt: archived ? Not(IsNull()) : IsNull() },
      order: archived
        ? { archivedAt: 'DESC', id: 'DESC' }
        : { position: 'ASC' },
    });
  }

  countActive(boardId: string): Promise<number> {
    return this.lists.countBy({ boardId, archivedAt: IsNull() });
  }

  create(input: CreateListInput): Promise<List> {
    return this.lists.save(this.lists.create(input));
  }

  // Raw SQL so the shifted lists keep their updated_at: only the moved,
  // archived or unarchived list counts as changed.
  async shift(
    boardId: string,
    from: number,
    to: number,
    delta: 1 | -1,
  ): Promise<void> {
    await this.lists.query(
      `UPDATE "lists" SET "position" = "position" + $4
       WHERE "board_id" = $1 AND "position" BETWEEN $2 AND $3`,
      [boardId, from, to, delta],
    );
  }

  save(list: List): Promise<List> {
    return this.lists.save(list);
  }

  async delete(id: string): Promise<void> {
    await this.lists.delete({ id });
  }
}
