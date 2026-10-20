import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { trim, trimToNull } from '../../boards/dto/create-board.dto';

export class UpdateCardDto {
  // @IsOptional would also let null through; a card always has a title
  // (CRD-15).
  @ApiPropertyOptional({ minLength: 1, maxLength: 100, example: 'Write spec' })
  @Transform(trim)
  @ValidateIf((dto: UpdateCardDto) => dto.title !== undefined)
  @IsString()
  @Length(1, 100)
  title?: string;

  // null (or a blank string) clears the description (CRD-16).
  @ApiPropertyOptional({ maxLength: 5000, nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  // null clears the due date; the rest as in CreateCardDto (CRD-16).
  @ApiPropertyOptional({
    format: 'date',
    nullable: true,
    type: String,
    example: '2026-11-01',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  dueDate?: string | null;

  // Same as title: null is not a boolean (CRD-17).
  @ApiPropertyOptional({ example: true })
  @ValidateIf((dto: UpdateCardDto) => dto.done !== undefined)
  @IsBoolean()
  done?: boolean;
}
