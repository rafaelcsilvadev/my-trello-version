import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { toUserResponse } from '../users/dto/user-response.dto';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  @ApiConflictResponse({
    description: 'Email taken: `/problems/email-already-registered`.',
  })
  async register(@Body() body: RegisterDto): Promise<AuthResponseDto> {
    const { accessToken, user } = await this.authService.register(body);
    return { accessToken, user: toUserResponse(user) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body: `errors[]` per field.' })
  @ApiUnauthorizedResponse({
    description: 'Wrong email or password: `/problems/invalid-credentials`.',
  })
  async login(@Body() body: LoginDto): Promise<AuthResponseDto> {
    const { accessToken, user } = await this.authService.login(body);
    return { accessToken, user: toUserResponse(user) };
  }
}
