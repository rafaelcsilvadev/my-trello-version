import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Not, Repository } from 'typeorm';
import { Board } from '../boards/board.entity';
import { lockOwnedBoard } from '../boards/board-lock';
import { Label } from '../labels/label.entity';
import { List } from '../lists/list.entity';
import { Card } from './card.entity';

export type CreateCardInput = Pick<
  Card,
  'listId' | 'title' | 'description' | 'dueDate'
> & { position: number };

export type ChecklistProgress = { total: number; done: number };

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

  // Inside transaction() this is the transaction's manager, so rows owned by
  // a card (checklist items) are written in the same transaction.
  get manager(): EntityManager {
    return this.cards.manager;
  }

  // Lists and cards share this lock (BE-AD-010). Only valid inside
  // transaction().
  lockOwnedBoard(ownerId: string, boardId: string): Promise<Board | null> {
    return lockOwnedBoard(this.cards.manager, ownerId, boardId);
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

  // A label of another board is null, so a card only takes its board's labels.
  findLabelInBoard(boardId: string, labelId: string): Promise<Label | null> {
    return this.cards.manager.findOneBy(Label, { id: labelId, boardId });
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

  // card_labels is written with raw SQL, never through a Card save, so
  // applying or removing a label leaves the card's updated_at unchanged.
  async linkLabel(cardId: string, labelId: string): Promise<void> {
    await this.cards.query(
      `INSERT INTO "card_labels" ("card_id", "label_id") VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [cardId, labelId],
    );
  }

  async unlinkLabel(cardId: string, labelId: string): Promise<void> {
    await this.cards.query(
      `DELETE FROM "card_labels" WHERE "card_id" = $1 AND "label_id" = $2`,
      [cardId, labelId],
    );
  }

  // One query for all cards; each card's ids follow label creation order.
  async labelIdsByCard(cardIds: string[]): Promise<Map<string, string[]>> {
    const labelIds = new Map(cardIds.map((id) => [id, [] as string[]]));
    if (cardIds.length === 0) {
      return labelIds;
    }

    const rows = await this.cards.query<
      { card_id: string; label_id: string }[]
    >(
      `SELECT "card_labels"."card_id", "card_labels"."label_id"
       FROM "card_labels"
       INNER JOIN "labels" ON "labels"."id" = "card_labels"."label_id"
       WHERE "card_labels"."card_id" = ANY($1)
       ORDER BY "labels"."created_at", "labels"."id"`,
      [cardIds],
    );
    for (const row of rows) {
      labelIds.get(row.card_id)!.push(row.label_id);
    }
    return labelIds;
  }

  // One query for all cards; a card without items counts zero of both.
  async checklistCountsByCard(
    cardIds: string[],
  ): Promise<Map<string, ChecklistProgress>> {
    const counts = new Map(
      cardIds.map((id): [string, ChecklistProgress] => [
        id,
        { total: 0, done: 0 },
      ]),
    );
    if (cardIds.length === 0) {
      return counts;
    }

    const rows = await this.cards.query<
      { card_id: string; total: number; done: number }[]
    >(
      `SELECT "card_id", count(*)::int AS "total",
              (count(*) FILTER (WHERE "done"))::int AS "done"
       FROM "checklist_items"
       WHERE "card_id" = ANY($1)
       GROUP BY "card_id"`,
      [cardIds],
    );
    for (const row of rows) {
      counts.set(row.card_id, { total: row.total, done: row.done });
    }
    return counts;
  }

  save(card: Card): Promise<Card> {
    return this.cards.save(card);
  }

  async delete(id: string): Promise<void> {
    await this.cards.delete({ id });
  }
}
