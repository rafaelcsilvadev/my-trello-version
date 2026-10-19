import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Board } from './board.entity';

export type CreateBoardInput = Pick<Board, 'ownerId' | 'title' | 'description'>;

// Every read and delete is scoped by owner (BE-AD-008): there is no unscoped
// finder, so a foreign id behaves exactly like a missing one.
@Injectable()
export class BoardsRepository {
  constructor(
    @InjectRepository(Board) private readonly boards: Repository<Board>,
  ) {}

  create(input: CreateBoardInput): Promise<Board> {
    return this.boards.save(this.boards.create(input));
  }

  findOwned(ownerId: string, id: string): Promise<Board | null> {
    return this.boards.findOneBy({ ownerId, id });
  }

  listOwned(ownerId: string, archived: boolean): Promise<Board[]> {
    return this.boards.find({
      where: { ownerId, archivedAt: archived ? Not(IsNull()) : IsNull() },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  // Persists changes to a board already loaded through findOwned.
  save(board: Board): Promise<Board> {
    return this.boards.save(board);
  }

  async deleteOwned(ownerId: string, id: string): Promise<void> {
    await this.boards.delete({ ownerId, id });
  }
}
