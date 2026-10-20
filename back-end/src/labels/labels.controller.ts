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
import { CreateLabelDto } from './dto/create-label.dto';
import { LabelResponseDto, toLabelResponse } from './dto/label-response.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelsService } from './labels.service';

// No prefix: routes live under boards/:boardId/labels and labels/:id.
@ApiTags('labels')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@Controller()
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post('boards/:boardId/labels')
  @ApiCreatedResponse({ type: LabelResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  @ApiNotFoundResponse({
    description: 'Missing, foreign or malformed board id.',
  })
  @ApiConflictResponse({
    description: 'The board is archived, or the name is taken on the board.',
  })
  async create(
    @CurrentUser() user: User,
    @Param('boardId') boardId: string,
    @Body() body: CreateLabelDto,
  ): Promise<LabelResponseDto> {
    const label = await this.labelsService.create(user.id, boardId, {
      name: body.name,
      color: body.color,
    });
    return toLabelResponse(label);
  }

  @Get('boards/:boardId/labels')
  @ApiOkResponse({ type: [LabelResponseDto] })
  @ApiNotFoundResponse({
    description: 'Missing, foreign or malformed board id.',
  })
  async listInBoard(
    @CurrentUser() user: User,
    @Param('boardId') boardId: string,
  ): Promise<LabelResponseDto[]> {
    const labels = await this.labelsService.listInBoard(user.id, boardId);
    return labels.map(toLabelResponse);
  }

  @Patch('labels/:id')
  @ApiOkResponse({ type: LabelResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  @ApiNotFoundResponse({ description: 'Missing, foreign or malformed id.' })
  @ApiConflictResponse({
    description: 'The board is archived, or the name is taken on the board.',
  })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: UpdateLabelDto,
  ): Promise<LabelResponseDto> {
    const label = await this.labelsService.update(user.id, id, {
      name: body.name,
      color: body.color,
    });
    return toLabelResponse(label);
  }
}
