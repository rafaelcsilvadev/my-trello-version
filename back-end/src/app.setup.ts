import {
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { ProblemDetailsFilter } from './errors/problem-details.filter';
import { validationExceptionFactory } from './errors/validation.exception';

const API_PREFIX = '/api/v1';

// All cross-cutting HTTP wiring, shared by main.ts and the e2e test app.
export function configureApp(app: NestExpressApplication): void {
  // Registered here so the next middleware sees the raw body-parser error;
  // Nest skips its own JSON parser when one is already applied.
  app.useBodyParser('json');
  app.use(rejectInvalidJson);
  // Nest mounts its 404 handler only inside the global prefix.
  app.use(rejectOutsidePrefix);
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
}

function rejectInvalidJson(
  error: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const parseFailed =
    error instanceof SyntaxError &&
    (error as SyntaxError & { type?: string }).type === 'entity.parse.failed';
  next(
    parseFailed
      ? new BadRequestException('Request body is not valid JSON.')
      : error,
  );
}

function rejectOutsidePrefix(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const insidePrefix =
    req.path === API_PREFIX || req.path.startsWith(`${API_PREFIX}/`);
  next(
    insidePrefix
      ? undefined
      : new NotFoundException(`Cannot ${req.method} ${req.path}`),
  );
}
