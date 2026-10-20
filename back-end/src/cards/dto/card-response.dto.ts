import { ApiProperty } from '@nestjs/swagger';
import type { CardWithLabels } from '../cards.service';

export class CardResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  listId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  dueDate!: string | null;

  @ApiProperty()
  done!: boolean;

  @ApiProperty({ type: Number, nullable: true })
  position!: number | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  labelIds!: string[];
}

// The only way a Card leaves the API.
export function toCardResponse(card: CardWithLabels): CardResponseDto {
  return {
    id: card.id,
    listId: card.listId,
    title: card.title,
    description: card.description,
    dueDate: card.dueDate,
    done: card.done,
    position: card.position,
    archivedAt: card.archivedAt?.toISOString() ?? null,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    labelIds: card.labelIds,
  };
}
