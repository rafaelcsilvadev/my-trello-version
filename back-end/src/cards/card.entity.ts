import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Plain FK column (FK_cards_list_id, ON DELETE CASCADE); no relation to
  // List, so cards never load the list row.
  @Column({ name: 'list_id', type: 'uuid' })
  listId!: string;

  @Column({ length: 100 })
  title!: string;

  @Column({ type: 'varchar', length: 5000, nullable: true })
  description!: string | null;

  // Calendar date without time zone; TypeORM hydrates `date` columns as
  // YYYY-MM-DD strings.
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string | null;

  @Column({ type: 'boolean', default: false })
  done!: boolean;

  // 0-based and contiguous among the list's active cards; NULL while
  // archived (CHK_cards_position_archived).
  @Column({ type: 'integer', nullable: true })
  position!: number | null;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
