import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Board } from '../boards/board.entity';
import { lockOwnedBoard } from '../boards/board-lock';
import { Label } from './label.entity';
import { LabelNameTakenError } from './labels.errors';

const UNIQUE_VIOLATION = '23505';
const NAME_UNIQUE_CONSTRAINT = 'UQ_labels_board_id_name';

export type CreateLabelInput = Pick<Label, 'boardId' | 'name' | 'color'>;

// Labels have no owner column: reads by id are scoped through the board's
// owner (BE-AD-008). Methods taking a boardId expect a board already checked
// (findOwned on BoardsService or lockOwnedBoard), and save/delete a label
// already loaded through findOwned.
@Injectable()
export class LabelsRepository {
  constructor(
    @InjectRepository(Label) private readonly labels: Repository<Label>,
  ) {}

  // Runs work with a repository bound to one transaction; any throw rolls
  // back every write made through it.
  transaction<T>(work: (labels: LabelsRepository) => Promise<T>): Promise<T> {
    return this.labels.manager.transaction((manager) =>
      work(new LabelsRepository(manager.getRepository(Label))),
    );
  }

  // Only valid inside transaction().
  lockOwnedBoard(ownerId: string, boardId: string): Promise<Board | null> {
    return lockOwnedBoard(this.labels.manager, ownerId, boardId);
  }

  findOwned(ownerId: string, id: string): Promise<Label | null> {
    return this.labels
      .createQueryBuilder('label')
      .innerJoin(Board, 'board', 'board.id = label.boardId')
      .where('label.id = :id', { id })
      .andWhere('board.ownerId = :ownerId', { ownerId })
      .getOne();
  }

  listInBoard(boardId: string): Promise<Label[]> {
    return this.labels.find({
      where: { boardId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  create(input: CreateLabelInput): Promise<Label> {
    return this.save(this.labels.create(input));
  }

  // Relies on the unique index instead of a prior lookup, so two concurrent
  // writes of one name on a board cannot both succeed (LBL-31).
  async save(label: Label): Promise<Label> {
    try {
      return await this.labels.save(label);
    } catch (error) {
      if (isNameConflict(error)) {
        throw new LabelNameTakenError();
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.labels.delete({ id });
  }
}

function isNameConflict(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const { code, constraint } = error.driverError as {
    code?: string;
    constraint?: string;
  };
  return code === UNIQUE_VIOLATION && constraint === NAME_UNIQUE_CONSTRAINT;
}
