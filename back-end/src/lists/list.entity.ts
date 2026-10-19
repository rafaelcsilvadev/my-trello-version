import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('lists')
export class List {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Plain FK column (FK_lists_board_id, ON DELETE CASCADE); no relation to
  // Board, so lists never load the board row.
  @Column({ name: 'board_id', type: 'uuid' })
  boardId!: string;

  @Column({ length: 100 })
  title!: string;

  // 0-based and contiguous among the board's active lists; NULL while
  // archived (CHK_lists_position_archived).
  @Column({ type: 'integer', nullable: true })
  position!: number | null;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
