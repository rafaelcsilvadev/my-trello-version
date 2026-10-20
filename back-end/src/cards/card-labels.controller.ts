import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../users/user.entity';
import { CardsService } from './cards.service';

// Kept apart from CardsController, which stays the card CRUD.
@ApiTags('cards')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@Controller('cards/:id/labels/:labelId')
export class CardLabelsController {
  constructor(private readonly cardsService: CardsService) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'The label is applied to the card, or already was.',
  })
  @ApiNotFoundResponse({
    description:
      'Missing, foreign or malformed card id, or a label id not of the card board.',
  })
  @ApiConflictResponse({
    description: 'The card, its list or its board is archived.',
  })
  async add(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('labelId') labelId: string,
  ): Promise<void> {
    await this.cardsService.addLabel(user.id, id, labelId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'The label is removed from the card, or was not applied.',
  })
  @ApiNotFoundResponse({
    description:
      'Missing, foreign or malformed card id, or a label id not of the card board.',
  })
  @ApiConflictResponse({
    description: 'The card, its list or its board is archived.',
  })
  async remove(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('labelId') labelId: string,
  ): Promise<void> {
    await this.cardsService.removeLabel(user.id, id, labelId);
  }
}
