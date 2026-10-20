import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Board } from '../boards/board.entity';
import { BoardArchivedError } from '../boards/boards.errors';
import { BoardsService } from '../boards/boards.service';
import { LabelNotFoundError } from '../labels/labels.errors';
import type { List } from '../lists/list.entity';
import { ListArchivedError, ListNotFoundError } from '../lists/lists.errors';
import { ListsService } from '../lists/lists.service';
import type { Card } from './card.entity';
import {
  CardArchivedError,
  CardNotArchivedError,
  CardNotFoundError,
} from './cards.errors';
import { CardsRepository } from './cards.repository';

export type NewCard = Pick<Card, 'title'> &
  Partial<Pick<Card, 'description' | 'dueDate'>>;

export type CardMoveTarget = { listId?: string; position: number };

export type UpdateCardChanges = Partial<
  Pick<Card, 'title' | 'description' | 'dueDate' | 'done'>
>;

// The ids follow label creation order (LBL-26).
export type CardWithLabels = Card & { labelIds: string[] };

// Active cards of a list hold positions 0..n-1. Every write runs under the
// board row lock shared with lists (BE-AD-010), so it reads and leaves a
// contiguous set, and the archive guards see the committed board and list.
@Injectable()
export class CardsService {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly listsService: ListsService,
    private readonly boardsService: BoardsService,
  ) {}

  async create(
    ownerId: string,
    listId: string,
    input: NewCard,
  ): Promise<CardWithLabels> {
    // A malformed id never reaches PostgreSQL, which would reject it as an
    // invalid uuid (CRD-06).
    const found = isUUID(listId)
      ? await this.cardsRepository.findOwnedList(ownerId, listId)
      : null;

    if (!found) {
      throw new ListNotFoundError();
    }

    const created = await this.cardsRepository.transaction(async (cards) => {
      const board = await cards.lockOwnedBoard(ownerId, found.boardId);
      const list = board ? await cards.findListInBoard(board.id, listId) : null;

      // The board, or the list alone, was deleted since the lookup.
      if (!board || !list) {
        throw new ListNotFoundError();
      }

      if (board.archivedAt) {
        throw new BoardArchivedError();
      }

      if (list.archivedAt) {
        throw new ListArchivedError();
      }

      const position = await cards.countActive(listId);
      return cards.create({
        listId,
        title: input.title,
        description: input.description ?? null,
        dueDate: input.dueDate ?? null,
        position,
      });
    });

    // A new card has no labels yet, so there is nothing to read.
    return { ...created, labelIds: [] };
  }

  // Reads skip the lock: cards of an archived list or board stay readable.
  async listInList(
    ownerId: string,
    listId: string,
    archived: boolean,
  ): Promise<CardWithLabels[]> {
    await this.listsService.findOwned(ownerId, listId);
    return this.withLabelIds(
      await this.cardsRepository.listInList(listId, archived),
    );
  }

  async listInBoard(
    ownerId: string,
    boardId: string,
    archived: boolean,
  ): Promise<CardWithLabels[]> {
    await this.boardsService.findOwned(ownerId, boardId);
    return this.withLabelIds(
      await this.cardsRepository.listInBoard(boardId, archived),
    );
  }

  async findOwned(ownerId: string, id: string): Promise<CardWithLabels> {
    return this.withLabelIdsOf(await this.findOwnedCard(ownerId, id));
  }

  private async findOwnedCard(ownerId: string, id: string): Promise<Card> {
    const card = isUUID(id)
      ? await this.cardsRepository.findOwned(ownerId, id)
      : null;

    if (!card) {
      throw new CardNotFoundError();
    }

    return card;
  }

  update(
    ownerId: string,
    id: string,
    changes: UpdateCardChanges,
  ): Promise<CardWithLabels> {
    return this.writeLocked(ownerId, id, (card, _list, cards) => {
      if (card.archivedAt) {
        throw new CardArchivedError();
      }

      const given = Object.entries(changes).filter(
        ([, value]) => value !== undefined,
      );

      // Saving would bump updatedAt, so an empty PATCH leaves the row alone
      // (CRD-18).
      if (given.length === 0) {
        return Promise.resolve(card);
      }

      Object.assign(card, Object.fromEntries(given));
      return cards.save(card);
    }).then((card) => this.withLabelIdsOf(card));
  }

  move(
    ownerId: string,
    id: string,
    target: CardMoveTarget,
  ): Promise<CardWithLabels> {
    return this.writeLocked(ownerId, id, async (card, list, cards) => {
      if (card.archivedAt || card.position === null) {
        throw new CardArchivedError();
      }

      const from = card.position;
      const n = await cards.countActive(card.listId);

      if (target.listId === undefined || target.listId === card.listId) {
        const to = Math.min(target.position, n - 1);

        // A same-place move leaves the row alone (CRD-23).
        if (to === from) {
          return card;
        }

        // Shifts first: the deferred unique constraint only checks the final
        // state at commit, so the temporary duplicate is fine.
        if (to < from) {
          await cards.shift(card.listId, to, from - 1, 1);
        } else {
          await cards.shift(card.listId, from + 1, to, -1);
        }

        card.position = to;
        return cards.save(card);
      }

      // Unknown, foreign and other-board lists all read as null (CRD-25).
      const destination = await cards.findListInBoard(
        list.boardId,
        target.listId,
      );

      if (!destination) {
        throw new ListNotFoundError();
      }

      if (destination.archivedAt) {
        throw new ListArchivedError();
      }

      if (from < n - 1) {
        await cards.shift(card.listId, from + 1, n - 1, -1);
      }

      const m = await cards.countActive(destination.id);
      const to = Math.min(target.position, m);

      if (to < m) {
        await cards.shift(destination.id, to, m - 1, 1);
      }

      card.listId = destination.id;
      card.position = to;
      return cards.save(card);
    }).then((card) => this.withLabelIdsOf(card));
  }

  archive(ownerId: string, id: string): Promise<CardWithLabels> {
    return this.writeLocked(ownerId, id, async (card, _list, cards) => {
      if (card.archivedAt || card.position === null) {
        return card;
      }

      const last = (await cards.countActive(card.listId)) - 1;

      if (card.position < last) {
        await cards.shift(card.listId, card.position + 1, last, -1);
      }

      card.position = null;
      card.archivedAt = new Date();
      return cards.save(card);
    }).then((card) => this.withLabelIdsOf(card));
  }

  unarchive(ownerId: string, id: string): Promise<CardWithLabels> {
    return this.writeLocked(ownerId, id, async (card, _list, cards) => {
      if (!card.archivedAt) {
        return card;
      }

      card.position = await cards.countActive(card.listId);
      card.archivedAt = null;
      return cards.save(card);
    }).then((card) => this.withLabelIdsOf(card));
  }

  async remove(ownerId: string, id: string): Promise<void> {
    // An archived card holds no position, so deleting it shifts nothing.
    await this.writeLocked(ownerId, id, async (card, _list, cards) => {
      if (!card.archivedAt) {
        throw new CardNotArchivedError();
      }

      await cards.delete(card.id);
    });
  }

  addLabel(ownerId: string, id: string, labelId: string): Promise<void> {
    return this.writeLabel(ownerId, id, labelId, (cards, cardId) =>
      cards.linkLabel(cardId, labelId),
    );
  }

  removeLabel(ownerId: string, id: string, labelId: string): Promise<void> {
    return this.writeLabel(ownerId, id, labelId, (cards, cardId) =>
      cards.unlinkLabel(cardId, labelId),
    );
  }

  // The label is looked up on the locked board, so a card only ever links a
  // label of its own board (LBL-22).
  private writeLabel(
    ownerId: string,
    id: string,
    labelId: string,
    write: (cards: CardsRepository, cardId: string) => Promise<void>,
  ): Promise<void> {
    return this.writeLocked(
      ownerId,
      id,
      (card, _list, cards) => {
        if (card.archivedAt) {
          throw new CardArchivedError();
        }

        return write(cards, card.id);
      },
      async (board, _card, cards) => {
        const label = isUUID(labelId)
          ? await cards.findLabelInBoard(board.id, labelId)
          : null;

        if (!label) {
          throw new LabelNotFoundError();
        }
      },
    );
  }

  // Item write flow: find the card's board through its list, lock it,
  // re-read the card and its list under the lock, then guard in precedence
  // order: card not found, the before hook's own checks, board archived,
  // list archived, then the card state checks inside work.
  private async writeLocked<T>(
    ownerId: string,
    id: string,
    work: (card: Card, list: List, cards: CardsRepository) => Promise<T>,
    before?: (
      board: Board,
      card: Card,
      cards: CardsRepository,
    ) => Promise<void>,
  ): Promise<T> {
    const found = await this.findOwnedCard(ownerId, id);
    const owningList = await this.cardsRepository.findOwnedList(
      ownerId,
      found.listId,
    );

    if (!owningList) {
      throw new CardNotFoundError();
    }

    return this.cardsRepository.transaction(async (cards) => {
      const board = await cards.lockOwnedBoard(ownerId, owningList.boardId);

      // The board was deleted since the lookup.
      if (!board) {
        throw new CardNotFoundError();
      }

      // The card may have moved to another list of the board since the
      // lookup, so its list is re-read from the locked card.
      const card = await cards.findOwned(ownerId, id);
      const list = card
        ? await cards.findListInBoard(board.id, card.listId)
        : null;

      // The card, or its list, was deleted since the lookup.
      if (!card || !list) {
        throw new CardNotFoundError();
      }

      await before?.(board, card, cards);

      if (board.archivedAt) {
        throw new BoardArchivedError();
      }

      if (list.archivedAt) {
        throw new ListArchivedError();
      }

      return work(card, list, cards);
    });
  }

  // Read after the write commits, outside the lock: a concurrent apply may or
  // may not show, the same as reading a moment later.
  private async withLabelIds(cards: Card[]): Promise<CardWithLabels[]> {
    const labelIds = await this.cardsRepository.labelIdsByCard(
      cards.map((card) => card.id),
    );
    return cards.map((card) => ({ ...card, labelIds: labelIds.get(card.id)! }));
  }

  private async withLabelIdsOf(card: Card): Promise<CardWithLabels> {
    const [withLabels] = await this.withLabelIds([card]);
    return withLabels;
  }
}
