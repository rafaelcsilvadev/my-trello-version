import {
  Body,
  Controller,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../users/user.entity';
import { CreateListDto } from './dto/create-list.dto';
import { ListListsQueryDto } from './dto/list-lists-query.dto';
import { ListResponseDto, toListResponse } from './dto/list-response.dto';
import { MoveListDto } from './dto/move-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { ListsService } from './lists.service';

// No prefix: routes live under both boards/:boardId/lists and lists/:id.
@ApiTags('lists')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@Controller()
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post('boards/:boardId/lists')
  @ApiCreatedResponse({ type: ListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  @ApiNotFoundResponse({
    description: 'Missing, foreign or malformed board id.',
  })
  @ApiConflictResponse({ description: 'The board is archived.' })
  async create(
    @CurrentUser() user: User,
    @Param('boardId') boardId: string,
    @Body() body: CreateListDto,
  ): Promise<ListResponseDto> {
    const list = await this.listsService.create(user.id, boardId, body.title);
    return toListResponse(list);
  }

  @Get('boards/:boardId/lists')
  @ApiOkResponse({ type: [ListResponseDto] })
  @ApiBadRequestResponse({ description: 'Invalid `archived` query value.' })
  @ApiNotFoundResponse({
    description: 'Missing, foreign or malformed board id.',
  })
  async list(
    @CurrentUser() user: User,
    @Param('boardId') boardId: string,
    @Query() query: ListListsQueryDto,
  ): Promise<ListResponseDto[]> {
    const lists = await this.listsService.listInBoard(
      user.id,
      boardId,
      query.archived === 'true',
    );
    return lists.map(toListResponse);
  }

  @Get('lists/:id')
  @ApiOkResponse({ type: ListResponseDto })
  @ApiNotFoundResponse({ description: 'Missing, foreign or malformed id.' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ListResponseDto> {
    return toListResponse(await this.listsService.findOwned(user.id, id));
  }

  @Patch('lists/:id')
  @ApiOkResponse({ type: ListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  @ApiNotFoundResponse({ description: 'Missing, foreign or malformed id.' })
  @ApiConflictResponse({
    description: 'The list or its board is archived.',
  })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: UpdateListDto,
  ): Promise<ListResponseDto> {
    const list = await this.listsService.update(user.id, id, {
      title: body.title,
    });
    return toListResponse(list);
  }

  @Post('lists/:id/move')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  @ApiNotFoundResponse({ description: 'Missing, foreign or malformed id.' })
  @ApiConflictResponse({
    description: 'The list or its board is archived.',
  })
  async move(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: MoveListDto,
  ): Promise<ListResponseDto> {
    const list = await this.listsService.move(user.id, id, body.position);
    return toListResponse(list);
  }
}
