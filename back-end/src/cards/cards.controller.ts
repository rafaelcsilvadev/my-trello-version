import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../users/user.entity';
import { CardResponseDto, toCardResponse } from './dto/card-response.dto';
import { CreateCardDto } from './dto/create-card.dto';
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
}
