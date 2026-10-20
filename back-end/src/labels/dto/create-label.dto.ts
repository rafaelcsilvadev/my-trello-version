import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Length } from 'class-validator';
import { trim } from '../../boards/dto/create-board.dto';
import { LABEL_COLORS, type LabelColor } from '../label-colors';

export class CreateLabelDto {
  @ApiProperty({ minLength: 1, maxLength: 50, example: 'Bug' })
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  name!: string;

  // Exact match: no case folding, so "Green" is rejected (LBL-04).
  @ApiProperty({ enum: LABEL_COLORS, example: 'red' })
  @IsIn(LABEL_COLORS)
  color!: LabelColor;
}
