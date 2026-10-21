import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Board } from '../boards/board.entity';
import { Card } from '../cards/card.entity';
import { List } from '../lists/list.entity';
import { ChecklistItem } from './checklist-item.entity';

export type CreateChecklistItemInput = Pick<
  ChecklistItem,
  'cardId' | 'text' | 'position'
>;

// Items have no owner column: reads by id are scoped through the card's
// board owner (BE-AD-008). Writes run on an instance bound to the card
// write's transaction, so they share its board lock (BE-AD-010). Methods
// taking a cardId expect a card already checked.
@Injectable()
export class ChecklistItemsRepository {
  constructor(
    @InjectRepository(ChecklistItem)
    private readonly items: Repository<ChecklistItem>,
  ) {}

  static bound(manager: EntityManager): ChecklistItemsRepository {
    return new ChecklistItemsRepository(manager.getRepository(ChecklistItem));
  }

  findOwned(ownerId: string, id: string): Promise<ChecklistItem | null> {
    return this.items
      .createQueryBuilder('item')
      .innerJoin(Card, 'card', 'card.id = item.cardId')
      .innerJoin(List, 'list', 'list.id = card.listId')
      .innerJoin(Board, 'board', 'board.id = list.boardId')
      .where('item.id = :id', { id })
      .andWhere('board.ownerId = :ownerId', { ownerId })
      .getOne();
  }

  // An item of another card is null, so a write never leaves the locked card.
  findInCard(cardId: string, id: string): Promise<ChecklistItem | null> {
    return this.items.findOneBy({ id, cardId });
  }

  listInCard(cardId: string): Promise<ChecklistItem[]> {
    return this.items.find({ where: { cardId }, order: { position: 'ASC' } });
  }

  countInCard(cardId: string): Promise<number> {
    return this.items.countBy({ cardId });
  }

  create(input: CreateChecklistItemInput): Promise<ChecklistItem> {
    return this.items.save(this.items.create(input));
  }

  // Raw SQL so the shifted items keep their updated_at: only the created,
  // moved or edited item counts as changed.
  async shift(
    cardId: string,
    from: number,
    to: number,
    delta: 1 | -1,
  ): Promise<void> {
    await this.items.query(
      `UPDATE "checklist_items" SET "position" = "position" + $4
       WHERE "card_id" = $1 AND "position" BETWEEN $2 AND $3`,
      [cardId, from, to, delta],
    );
  }

  save(item: ChecklistItem): Promise<ChecklistItem> {
    return this.items.save(item);
  }

  async delete(id: string): Promise<void> {
    await this.items.delete({ id });
  }
}
