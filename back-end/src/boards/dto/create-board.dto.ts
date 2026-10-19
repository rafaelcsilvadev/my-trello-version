import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

// Transforms leave non-strings untouched, so @IsString still rejects them.
export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// A blank description means "no description", stored as null (BRD-02).
export const trimToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class CreateBoardDto {
  @ApiProperty({ minLength: 1, maxLength: 100, example: 'Roadmap' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  title!: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}
