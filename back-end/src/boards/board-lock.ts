import type { EntityManager } from 'typeorm';
import { Board } from './board.entity';

// SELECT ... FOR UPDATE: serializes every board-scoped write on one board
// until the transaction ends (BE-AD-010). Only valid inside a transaction.
export function lockOwnedBoard(
  manager: EntityManager,
  ownerId: string,
  boardId: string,
): Promise<Board | null> {
  return manager.findOne(Board, {
    where: { id: boardId, ownerId },
    lock: { mode: 'pessimistic_write' },
  });
}
