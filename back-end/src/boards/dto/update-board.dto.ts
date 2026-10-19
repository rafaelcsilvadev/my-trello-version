import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { trim, trimToNull } from './create-board.dto';

export class UpdateBoardDto {
  // @IsOptional would also let null through; a board always has a title
  // (BRD-12).
  @ApiPropertyOptional({ minLength: 1, maxLength: 100, example: 'Roadmap' })
  @Transform(trim)
  @ValidateIf((dto: UpdateBoardDto) => dto.title !== undefined)
  @IsString()
  @Length(1, 100)
  title?: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}
