import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('boards')
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Plain FK column (FK_boards_owner_id, ON DELETE CASCADE); no relation to
  // User, so boards never load the owner row.
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ length: 100 })
  title!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
