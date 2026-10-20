import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Board } from '../boards/board.entity';
import { List } from '../lists/list.entity';
import { Card } from './card.entity';

export type CreateCardInput = Pick<
  Card,
  'listId' | 'title' | 'description' | 'dueDate'
> & { position: number };

// Cards have no owner column: reads by id are scoped through the list's
// board owner (BE-AD-008). Methods taking a boardId or listId expect it
// already checked (findOwned, findOwnedList or lockOwnedBoard), and
// save/delete a card already loaded through findOwned.
@Injectable()
export class CardsRepository {
  constructor(
    @InjectRepository(Card) private readonly cards: Repository<Card>,
  ) {}

  // Runs work with a repository bound to one transaction; any throw rolls
  // back every write made through it.
  transaction<T>(work: (cards: CardsRepository) => Promise<T>): Promise<T> {
    return this.cards.manager.transaction((manager) =>
      work(new CardsRepository(manager.getRepository(Card))),
    );
  }

  // SELECT ... FOR UPDATE: serializes position writes on one board until the
  // transaction ends; lists and cards share this lock (BE-AD-010). Only valid
  // inside transaction().
  lockOwnedBoard(ownerId: string, boardId: string): Promise<Board | null> {
    return this.cards.manager.findOne(Board, {
      where: { id: boardId, ownerId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  findOwned(ownerId: string, id: string): Promise<Card | null> {
    return this.cards
      .createQueryBuilder('card')
      .innerJoin(List, 'list', 'list.id = card.listId')
      .innerJoin(Board, 'board', 'board.id = list.boardId')
      .where('card.id = :id', { id })
      .andWhere('board.ownerId = :ownerId', { ownerId })
      .getOne();
  }

  findOwnedList(ownerId: string, listId: string): Promise<List | null> {
    return this.cards.manager
      .createQueryBuilder(List, 'list')
      .innerJoin(Board, 'board', 'board.id = list.boardId')
      .where('list.id = :listId', { listId })
      .andWhere('board.ownerId = :ownerId', { ownerId })
      .getOne();
  }

  // A list of another board is null, so a move never leaves the locked board.
  findListInBoard(boardId: string, listId: string): Promise<List | null> {
    return this.cards.manager.findOneBy(List, { id: listId, boardId });
  }

  listInList(listId: string, archived: boolean): Promise<Card[]> {
    return this.cards.find({
      where: { listId, archivedAt: archived ? Not(IsNull()) : IsNull() },
      order: archived
        ? { archivedAt: 'DESC', id: 'DESC' }
        : { position: 'ASC' },
    });
  }

  // Active cards of an archived list stay hidden from the board view;
  // archived cards are listed whatever their list's state.
  listInBoard(boardId: string, archived: boolean): Promise<Card[]> {
    const query = this.cards
      .createQueryBuilder('card')
      .innerJoin(List, 'list', 'list.id = card.listId')
      .where('list.boardId = :boardId', { boardId });

    if (archived) {
      return query
        .andWhere('card.archivedAt IS NOT NULL')
        .orderBy('card.archivedAt', 'DESC')
        .addOrderBy('card.id', 'DESC')
        .getMany();
    }
    return query
      .andWhere('card.archivedAt IS NULL')
      .andWhere('list.archivedAt IS NULL')
      .orderBy('list.position', 'ASC')
      .addOrderBy('card.position', 'ASC')
      .getMany();
  }

  countActive(listId: string): Promise<number> {
    return this.cards.countBy({ listId, archivedAt: IsNull() });
  }

  create(input: CreateCardInput): Promise<Card> {
    return this.cards.save(this.cards.create(input));
  }

  // Raw SQL so the shifted cards keep their updated_at: only the created,
  // moved, archived or unarchived card counts as changed.
  async shift(
    listId: string,
    from: number,
    to: number,
    delta: 1 | -1,
  ): Promise<void> {
    await this.cards.query(
      `UPDATE "cards" SET "position" = "position" + $4
       WHERE "list_id" = $1 AND "position" BETWEEN $2 AND $3`,
      [listId, from, to, delta],
    );
  }

  save(card: Card): Promise<Card> {
    return this.cards.save(card);
  }

  async delete(id: string): Promise<void> {
    await this.cards.delete({ id });
  }
}
