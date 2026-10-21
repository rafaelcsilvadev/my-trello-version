import { ApiProperty } from '@nestjs/swagger';
import type { ChecklistItem } from '../checklist-item.entity';

export class ChecklistItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  cardId!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  done!: boolean;

  @ApiProperty({ minimum: 0 })
  position!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

// The only way a ChecklistItem leaves the API.
export function toChecklistItemResponse(
  item: ChecklistItem,
): ChecklistItemResponseDto {
  return {
    id: item.id,
    cardId: item.cardId,
    text: item.text,
    done: item.done,
    position: item.position,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
