import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, ValidateIf } from 'class-validator';
import { trim } from '../../boards/dto/create-board.dto';
import { LABEL_COLORS, type LabelColor } from '../label-colors';

export class UpdateLabelDto {
  // @IsOptional would also let null through; a label always has a name and
  // a color (LBL-11, LBL-12).
  @ApiPropertyOptional({ minLength: 1, maxLength: 50, example: 'Defect' })
  @Transform(trim)
  @ValidateIf((dto: UpdateLabelDto) => dto.name !== undefined)
  @IsString()
  @Length(1, 50)
  name?: string;

  @ApiPropertyOptional({ enum: LABEL_COLORS, example: 'orange' })
  @ValidateIf((dto: UpdateLabelDto) => dto.color !== undefined)
  @IsIn(LABEL_COLORS)
  color?: LabelColor;
}
