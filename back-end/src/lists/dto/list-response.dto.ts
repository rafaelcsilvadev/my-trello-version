import { ApiProperty } from '@nestjs/swagger';
import type { List } from '../list.entity';

export class ListResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  boardId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: Number, nullable: true })
  position!: number | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

// The only way a List leaves the API.
export function toListResponse(list: List): ListResponseDto {
  return {
    id: list.id,
    boardId: list.boardId,
    title: list.title,
    position: list.position,
    archivedAt: list.archivedAt?.toISOString() ?? null,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  };
}
