import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { trim } from '../../boards/dto/create-board.dto';

export class CreateChecklistItemDto {
  @ApiProperty({ minLength: 1, maxLength: 200, example: 'Write tests' })
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  text!: string;
}
