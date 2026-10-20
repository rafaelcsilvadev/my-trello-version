import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { trim, trimToNull } from '../../boards/dto/create-board.dto';

export class CreateCardDto {
  @ApiProperty({ minLength: 1, maxLength: 100, example: 'Write spec' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  title!: string;

  @ApiPropertyOptional({ maxLength: 5000, nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  // The pattern pins the YYYY-MM-DD form; strict ISO 8601 rejects dates that
  // are not on the calendar, such as 2026-02-30 (CRD-05).
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
}
