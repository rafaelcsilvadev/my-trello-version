import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, ValidateIf } from 'class-validator';
import { trim } from '../../boards/dto/create-board.dto';

export class UpdateListDto {
  // @IsOptional would also let null through; a list always has a title
  // (LST-11).
  @ApiPropertyOptional({ minLength: 1, maxLength: 100, example: 'Backlog' })
  @Transform(trim)
  @ValidateIf((dto: UpdateListDto) => dto.title !== undefined)
  @IsString()
  @Length(1, 100)
  title?: string;
}
