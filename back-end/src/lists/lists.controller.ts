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
import { CreateListDto } from './dto/create-list.dto';
import { ListResponseDto, toListResponse } from './dto/list-response.dto';
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
}
