import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { trim } from '../../boards/dto/create-board.dto';

export class CreateListDto {
  @ApiProperty({ minLength: 1, maxLength: 100, example: 'To do' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  title!: string;
}
