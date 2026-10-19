import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class MoveListDto {
  // No upper bound: the service clamps a position past the end (LST-15).
  @ApiProperty({ minimum: 0, example: 0 })
  @IsInt()
  @Min(0)
  position!: number;
}
