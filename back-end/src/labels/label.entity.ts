import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { LabelColor } from './label-colors';

@Entity('labels')
export class Label {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Plain FK column (FK_labels_board_id, ON DELETE CASCADE); no relation to
  // Board, so labels never load the board row.
  @Column({ name: 'board_id', type: 'uuid' })
  boardId!: string;

  // Stored trimmed; unique per board ignoring case (UQ_labels_board_id_name).
  @Column({ length: 50 })
  name!: string;

  // One of LABEL_COLORS (CHK_labels_color).
  @Column({ type: 'varchar', length: 10 })
  color!: LabelColor;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
