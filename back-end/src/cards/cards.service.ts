import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { BoardArchivedError } from '../boards/boards.errors';
import { BoardsService } from '../boards/boards.service';
import type { List } from '../lists/list.entity';
import { ListArchivedError, ListNotFoundError } from '../lists/lists.errors';
import { ListsService } from '../lists/lists.service';
import type { Card } from './card.entity';
import { CardArchivedError, CardNotFoundError } from './cards.errors';
import { CardsRepository } from './cards.repository';

export type NewCard = Pick<Card, 'title'> &
  Partial<Pick<Card, 'description' | 'dueDate'>>;

export type UpdateCardChanges = Partial<
  Pick<Card, 'title' | 'description' | 'dueDate' | 'done'>
>;

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

  async create(ownerId: string, listId: string, input: NewCard): Promise<Card> {
    // A malformed id never reaches PostgreSQL, which would reject it as an
    // invalid uuid (CRD-06).
    const found = isUUID(listId)
      ? await this.cardsRepository.findOwnedList(ownerId, listId)
      : null;

    if (!found) {
      throw new ListNotFoundError();
    }

    return this.cardsRepository.transaction(async (cards) => {
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
  }

  // Reads skip the lock: cards of an archived list or board stay readable.
  async listInList(
    ownerId: string,
    listId: string,
    archived: boolean,
  ): Promise<Card[]> {
    await this.listsService.findOwned(ownerId, listId);
    return this.cardsRepository.listInList(listId, archived);
  }

  async listInBoard(
    ownerId: string,
    boardId: string,
    archived: boolean,
  ): Promise<Card[]> {
    await this.boardsService.findOwned(ownerId, boardId);
    return this.cardsRepository.listInBoard(boardId, archived);
  }

  async findOwned(ownerId: string, id: string): Promise<Card> {
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
  ): Promise<Card> {
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
    });
  }

  // Item write flow: find the card's board through its list, lock it,
  // re-read the card and its list under the lock, then guard in precedence
  // order: card not found, board archived, list archived, then the card
  // state checks inside work.
  private async writeLocked<T>(
    ownerId: string,
    id: string,
    work: (card: Card, list: List, cards: CardsRepository) => Promise<T>,
  ): Promise<T> {
    const found = await this.findOwned(ownerId, id);
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

      if (board.archivedAt) {
        throw new BoardArchivedError();
      }

      if (list.archivedAt) {
        throw new ListArchivedError();
      }

      return work(card, list, cards);
    });
  }
}
