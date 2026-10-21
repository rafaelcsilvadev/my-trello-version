import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
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
import { ChecklistItemsService } from './checklist-items.service';
import {
  ChecklistItemResponseDto,
  toChecklistItemResponse,
} from './dto/checklist-item-response.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

// No prefix: routes live under cards/:cardId/checklist-items and
// checklist-items/:id.
@ApiTags('checklists')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@Controller()
export class ChecklistItemsController {
  constructor(private readonly itemsService: ChecklistItemsService) {}

  @Post('cards/:cardId/checklist-items')
  @ApiCreatedResponse({ type: ChecklistItemResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  @ApiNotFoundResponse({
    description: 'Missing, foreign or malformed card id.',
  })
  @ApiConflictResponse({
    description: 'The card, its list or its board is archived.',
  })
  async create(
    @CurrentUser() user: User,
    @Param('cardId') cardId: string,
    @Body() body: CreateChecklistItemDto,
  ): Promise<ChecklistItemResponseDto> {
    const item = await this.itemsService.create(user.id, cardId, body.text);
    return toChecklistItemResponse(item);
  }

  @Get('cards/:cardId/checklist-items')
  @ApiOkResponse({ type: [ChecklistItemResponseDto] })
  @ApiNotFoundResponse({
    description: 'Missing, foreign or malformed card id.',
  })
  async listInCard(
    @CurrentUser() user: User,
    @Param('cardId') cardId: string,
  ): Promise<ChecklistItemResponseDto[]> {
    const items = await this.itemsService.listInCard(user.id, cardId);
    return items.map(toChecklistItemResponse);
  }

  @Patch('checklist-items/:id')
  @ApiOkResponse({ type: ChecklistItemResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  @ApiNotFoundResponse({
    description: 'Missing, foreign or malformed checklist item id.',
  })
  @ApiConflictResponse({
    description: 'The card, its list or its board is archived.',
  })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: UpdateChecklistItemDto,
  ): Promise<ChecklistItemResponseDto> {
    const item = await this.itemsService.update(user.id, id, body);
    return toChecklistItemResponse(item);
  }
}
