import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { User } from '../users/user.entity';
import { UsersRepository } from '../users/users.repository';
import { IS_PUBLIC } from './public.decorator';

export type AuthenticatedRequest = Request & { user?: User };

// Default-deny: every route needs a valid access token unless it is
// marked with @Public() (BE-AD-006).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.authenticate(request.headers.authorization);
    if (!user) {
      throw new UnauthorizedException('Missing or invalid access token.');
    }
    request.user = user;
    return true;
  }

  private async authenticate(header: string | undefined): Promise<User | null> {
    const token = extractBearerToken(header);
    if (!token) {
      return null;
    }
    const sub = await this.verifySubject(token);
    return sub ? this.usersRepository.findById(sub) : null;
  }

  // The algorithm is pinned to HS256 here as well as in the module options,
  // so an unsigned "alg: none" token can never pass.
  private async verifySubject(token: string): Promise<string | null> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: unknown }>(
        token,
        { algorithms: ['HS256'] },
      );
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}

// Auth schemes are case-insensitive (RFC 9110, section 11.1).
function extractBearerToken(header: string | undefined): string | null {
  const [scheme, token] = header?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}
