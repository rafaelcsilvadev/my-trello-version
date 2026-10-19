import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
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
import { UpdateBoardDto } from './dto/update-board.dto';

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

  @Patch(':id')
  @ApiOkResponse({ type: BoardResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  @ApiNotFoundResponse({ description: 'Missing, foreign or malformed id.' })
  @ApiConflictResponse({ description: 'The board is archived.' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: UpdateBoardDto,
  ): Promise<BoardResponseDto> {
    const board = await this.boardsService.update(user.id, id, {
      title: body.title,
      description: body.description,
    });
    return toBoardResponse(board);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: BoardResponseDto })
  @ApiNotFoundResponse({ description: 'Missing, foreign or malformed id.' })
  async archive(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<BoardResponseDto> {
    return toBoardResponse(await this.boardsService.archive(user.id, id));
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: BoardResponseDto })
  @ApiNotFoundResponse({ description: 'Missing, foreign or malformed id.' })
  async unarchive(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<BoardResponseDto> {
    return toBoardResponse(await this.boardsService.unarchive(user.id, id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'The board was deleted.' })
  @ApiNotFoundResponse({ description: 'Missing, foreign or malformed id.' })
  @ApiConflictResponse({ description: 'The board is not archived.' })
  async remove(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    await this.boardsService.remove(user.id, id);
  }
}
