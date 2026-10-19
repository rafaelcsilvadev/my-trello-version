import { ApiProperty } from '@nestjs/swagger';
import type { Board } from '../board.entity';

export class BoardResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

// The only way a Board leaves the API, so ownerId never does.
export function toBoardResponse(board: Board): BoardResponseDto {
  return {
    id: board.id,
    title: board.title,
    description: board.description,
    archivedAt: board.archivedAt?.toISOString() ?? null,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  };
}
