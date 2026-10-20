import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class MoveCardDto {
  // Absent (or the card's own list) means a move within the list (CRD-20).
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  listId?: string;

  // No upper bound: the service clamps a position past the end (CRD-22).
  @ApiProperty({ minimum: 0, example: 0 })
  @IsInt()
  @Min(0)
  position!: number;
}
