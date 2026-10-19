import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

// Query values arrive as strings; the controller turns this into a boolean.
export class ListBoardsQueryDto {
  @ApiPropertyOptional({ enum: ['true', 'false'], default: 'false' })
  @IsOptional()
  @IsIn(['true', 'false'])
  archived?: 'true' | 'false';
}
