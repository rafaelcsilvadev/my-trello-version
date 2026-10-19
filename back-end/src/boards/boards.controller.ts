import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../users/user.entity';
import { BoardsService } from './boards.service';
import { BoardResponseDto, toBoardResponse } from './dto/board-response.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { ListBoardsQueryDto } from './dto/list-boards-query.dto';

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

  @Get()
  @ApiOkResponse({ type: [BoardResponseDto] })
  @ApiBadRequestResponse({ description: 'Invalid `archived` query value.' })
  async list(
    @CurrentUser() user: User,
    @Query() query: ListBoardsQueryDto,
  ): Promise<BoardResponseDto[]> {
    const boards = await this.boardsService.list(
      user.id,
      query.archived === 'true',
    );
    return boards.map(toBoardResponse);
  }

  @Get(':id')
  @ApiOkResponse({ type: BoardResponseDto })
  @ApiNotFoundResponse({ description: 'Missing, foreign or malformed id.' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<BoardResponseDto> {
    return toBoardResponse(await this.boardsService.findOwned(user.id, id));
  }
}
