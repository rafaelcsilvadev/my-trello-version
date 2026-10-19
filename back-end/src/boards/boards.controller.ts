import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../users/user.entity';
import { BoardsService } from './boards.service';
import { BoardResponseDto, toBoardResponse } from './dto/board-response.dto';
import { CreateBoardDto } from './dto/create-board.dto';

@ApiTags('boards')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  @ApiCreatedResponse({ type: BoardResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  async create(
    @CurrentUser() user: User,
    @Body() body: CreateBoardDto,
  ): Promise<BoardResponseDto> {
    const board = await this.boardsService.create(user.id, {
      title: body.title,
      description: body.description ?? null,
    });
    return toBoardResponse(board);
  }
}
