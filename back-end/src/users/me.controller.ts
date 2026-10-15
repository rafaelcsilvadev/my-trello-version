import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserResponseDto, toUserResponse } from './dto/user-response.dto';
import type { User } from './user.entity';

@ApiTags('users')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  @Get()
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  get(@CurrentUser() user: User): UserResponseDto {
    return toUserResponse(user);
  }
}
