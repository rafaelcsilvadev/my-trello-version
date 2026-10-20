import { ApiProperty } from '@nestjs/swagger';
import { LABEL_COLORS, type LabelColor } from '../label-colors';
import type { Label } from '../label.entity';

export class LabelResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  boardId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: LABEL_COLORS })
  color!: LabelColor;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

// The only way a Label leaves the API.
export function toLabelResponse(label: Label): LabelResponseDto {
  return {
    id: label.id,
    boardId: label.boardId,
    name: label.name,
    color: label.color,
    createdAt: label.createdAt.toISOString(),
    updatedAt: label.updatedAt.toISOString(),
  };
}
