import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('checklist_items')
export class ChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Plain FK column (FK_checklist_items_card_id, ON DELETE CASCADE); no
  // relation to Card, so items never load the card row.
  @Column({ name: 'card_id', type: 'uuid' })
  cardId!: string;

  // Stored trimmed.
  @Column({ length: 200 })
  text!: string;

  @Column({ type: 'boolean', default: false })
  done!: boolean;

  // 0-based and contiguous among the card's items.
  @Column({ type: 'integer' })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
