import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsString, Length, ValidateIf } from 'class-validator';
import { trim } from '../../boards/dto/create-board.dto';

export class UpdateChecklistItemDto {
  // @IsOptional would also let null through; an item always has a text
  // (CHK-07).
  @ApiPropertyOptional({ minLength: 1, maxLength: 200, example: 'Ship it' })
  @Transform(trim)
  @ValidateIf((dto: UpdateChecklistItemDto) => dto.text !== undefined)
  @IsString()
  @Length(1, 200)
  text?: string;

  // Same as text: null is not a boolean (CHK-08).
  @ApiPropertyOptional({ example: true })
  @ValidateIf((dto: UpdateChecklistItemDto) => dto.done !== undefined)
  @IsBoolean()
  done?: boolean;
}
