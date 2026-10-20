import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
import { CardResponseDto, toCardResponse } from './dto/card-response.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { ListCardsQueryDto } from './dto/list-cards-query.dto';
import { CardsService } from './cards.service';

// No prefix: routes live under lists/:listId/cards, boards/:boardId/cards and
// cards/:id.
@ApiTags('cards')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@Controller()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post('lists/:listId/cards')
  @ApiCreatedResponse({ type: CardResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  @ApiNotFoundResponse({
    description: 'Missing, foreign or malformed list id.',
  })
  @ApiConflictResponse({ description: 'The list or its board is archived.' })
  async create(
    @CurrentUser() user: User,
    @Param('listId') listId: string,
    @Body() body: CreateCardDto,
  ): Promise<CardResponseDto> {
    const card = await this.cardsService.create(user.id, listId, {
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
    });
    return toCardResponse(card);
  }

  @Get('lists/:listId/cards')
  @ApiOkResponse({ type: [CardResponseDto] })
  @ApiBadRequestResponse({ description: 'Invalid `archived` query value.' })
  @ApiNotFoundResponse({
    description: 'Missing, foreign or malformed list id.',
  })
  async listInList(
    @CurrentUser() user: User,
    @Param('listId') listId: string,
    @Query() query: ListCardsQueryDto,
  ): Promise<CardResponseDto[]> {
    const cards = await this.cardsService.listInList(
      user.id,
      listId,
      query.archived === 'true',
    );
    return cards.map(toCardResponse);
  }

  @Get('boards/:boardId/cards')
  @ApiOkResponse({ type: [CardResponseDto] })
  @ApiBadRequestResponse({ description: 'Invalid `archived` query value.' })
  @ApiNotFoundResponse({
    description: 'Missing, foreign or malformed board id.',
  })
  async listInBoard(
    @CurrentUser() user: User,
    @Param('boardId') boardId: string,
    @Query() query: ListCardsQueryDto,
  ): Promise<CardResponseDto[]> {
    const cards = await this.cardsService.listInBoard(
      user.id,
      boardId,
      query.archived === 'true',
    );
    return cards.map(toCardResponse);
  }

  @Get('cards/:id')
  @ApiOkResponse({ type: CardResponseDto })
  @ApiNotFoundResponse({ description: 'Missing, foreign or malformed id.' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<CardResponseDto> {
    return toCardResponse(await this.cardsService.findOwned(user.id, id));
  }
}
