import {
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import type { HttpLogger } from 'pino-http';
import { ProblemDetailsFilter } from './errors/problem-details.filter';
import { validationExceptionFactory } from './errors/validation.exception';
import { HTTP_LOGGER } from './logging/logging.module';

const API_PREFIX = '/api/v1';
// Swagger UI and its assets live here; the JSON document at `${DOCS_PATH}-json`.
const DOCS_PATH = '/api/docs';

// All cross-cutting HTTP wiring, shared by main.ts and the e2e test app.
export function configureApp(app: NestExpressApplication): void {
  app.useLogger(app.get(Logger));
  // First middleware, so every response gets a request id and an access log
  // line, including body-parser and out-of-prefix errors raised below.
  app.use(app.get<HttpLogger>(HTTP_LOGGER));
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
  setupSwagger(app);
  app.enableShutdownHooks();
}

function setupSwagger(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle('My Trello API')
    .setVersion('1.0')
    .build();
  // useGlobalPrefix is off by default, so the docs stay at /api/docs.
  SwaggerModule.setup(DOCS_PATH, app, () =>
    SwaggerModule.createDocument(app, config),
  );
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
  const served =
    req.path === `${DOCS_PATH}-json` ||
    [API_PREFIX, DOCS_PATH].some(
      (prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`),
    );
  next(
    served
      ? undefined
      : new NotFoundException(`Cannot ${req.method} ${req.path}`),
  );
}
