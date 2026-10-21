import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { CardNotFoundError } from '../cards/cards.errors';
import { CardsService } from '../cards/cards.service';
import { ChecklistItem } from './checklist-item.entity';
import { ChecklistItemsRepository } from './checklist-items.repository';
import { ChecklistItemNotFoundError } from './checklists.errors';

export type UpdateChecklistItemChanges = Partial<
  Pick<ChecklistItem, 'text' | 'done'>
>;

// Items of a card hold positions 0..n-1. An item write is a card write: it
// runs through CardsService.writeActiveCard, under the board row lock
// (BE-AD-010), on a repository bound to that transaction.
@Injectable()
export class ChecklistItemsService {
  constructor(
    private readonly itemsRepository: ChecklistItemsRepository,
    private readonly cardsService: CardsService,
  ) {}

  create(
    ownerId: string,
    cardId: string,
    text: string,
  ): Promise<ChecklistItem> {
    return this.cardsService.writeActiveCard(
      ownerId,
      cardId,
      async (card, manager) => {
        const items = ChecklistItemsRepository.bound(manager);
        const position = await items.countInCard(card.id);
        return items.create({ cardId: card.id, text, position });
      },
    );
  }

  // Reads skip the lock: items of an archived card, list or board stay
  // readable.
  async listInCard(ownerId: string, cardId: string): Promise<ChecklistItem[]> {
    await this.cardsService.findOwnedCard(ownerId, cardId);
    return this.itemsRepository.listInCard(cardId);
  }

  update(
    ownerId: string,
    id: string,
    changes: UpdateChecklistItemChanges,
  ): Promise<ChecklistItem> {
    return this.writeItem(ownerId, id, (item, items) => {
      const given = Object.entries(changes).filter(
        ([, value]) => value !== undefined,
      );

      // Saving would bump updatedAt, so an empty PATCH leaves the row alone
      // (CHK-09).
      if (given.length === 0) {
        return Promise.resolve(item);
      }

      Object.assign(item, Object.fromEntries(given));
      return items.save(item);
    });
  }

  move(ownerId: string, id: string, position: number): Promise<ChecklistItem> {
    return this.writeItem(ownerId, id, async (item, items) => {
      const from = item.position;
      const to = Math.min(position, (await items.countInCard(item.cardId)) - 1);

      // A same-place move leaves the row alone (CHK-12).
      if (to === from) {
        return item;
      }

      // Shifts first: the deferred unique constraint only checks the final
      // state at commit, so the temporary duplicate is fine.
      if (to < from) {
        await items.shift(item.cardId, to, from - 1, 1);
      } else {
        await items.shift(item.cardId, from + 1, to, -1);
      }

      item.position = to;
      return items.save(item);
    });
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.writeItem(ownerId, id, async (item, items) => {
      const last = (await items.countInCard(item.cardId)) - 1;
      await items.delete(item.id);

      if (item.position < last) {
        await items.shift(item.cardId, item.position + 1, last, -1);
      }
    });
  }

  // Item write flow: find the item through its card's board owner, then
  // write its card. Under the lock the item is re-read ahead of the archived
  // guards, so a missing item wins over an archived card (BE-AD-011). Item
  // routes only ever answer the item's 404 (CHK-23): a card deleted since
  // the lookup reads as the item gone with it.
  private async writeItem<T>(
    ownerId: string,
    id: string,
    work: (item: ChecklistItem, items: ChecklistItemsRepository) => Promise<T>,
  ): Promise<T> {
    // A malformed id never reaches PostgreSQL, which would reject it as an
    // invalid uuid.
    const found = isUUID(id)
      ? await this.itemsRepository.findOwned(ownerId, id)
      : null;

    if (!found) {
      throw new ChecklistItemNotFoundError();
    }

    let locked: ChecklistItem | null = null;

    try {
      return await this.cardsService.writeActiveCard(
        ownerId,
        found.cardId,
        (_card, manager) =>
          work(locked!, ChecklistItemsRepository.bound(manager)),
        async (card, manager) => {
          locked = await ChecklistItemsRepository.bound(manager).findInCard(
            card.id,
            id,
          );

          // The item was deleted since the lookup.
          if (!locked) {
            throw new ChecklistItemNotFoundError();
          }
        },
      );
    } catch (error) {
      if (error instanceof CardNotFoundError) {
        throw new ChecklistItemNotFoundError();
      }

      throw error;
    }
  }
}
