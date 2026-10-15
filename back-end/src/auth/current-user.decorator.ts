import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '../users/user.entity';
import type { AuthenticatedRequest } from './jwt-auth.guard';

// The caller loaded by JwtAuthGuard; only valid on protected routes.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user as User,
);
