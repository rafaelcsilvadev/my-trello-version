import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class MoveChecklistItemDto {
  // No upper bound: the service clamps a position past the end (CHK-11).
  @ApiProperty({ minimum: 0, example: 0 })
  @IsInt()
  @Min(0)
  position!: number;
}
