import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
  ValidationPipe,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { HttpLogger } from 'pino-http';
import { ProblemDetailsFilter } from './errors/problem-details.filter';
import { validationExceptionFactory } from './errors/validation.exception';
import { HTTP_LOGGER } from './logging/logging.module';

const API_PREFIX = '/api/v1';
// Swagger UI and its assets live here; the JSON document at `${DOCS_PATH}-json`.
const DOCS_PATH = '/api/docs';
// Same as body-parser's default, made explicit so the 413 detail can name it.
const JSON_BODY_LIMIT = '100kb';

// All cross-cutting HTTP wiring, shared by main.ts and the e2e test app.
export function configureApp(app: NestExpressApplication): void {
  app.useLogger(app.get(Logger));
  // First middleware, so every response gets a request id and an access log
  // line, including body-parser and out-of-prefix errors raised below.
  app.use(app.get<HttpLogger>(HTTP_LOGGER));
  // Before any middleware that can fail, so error responses carry them too.
  app.use(helmet());
  // Registered here so the next middleware sees the raw body-parser error;
  // Nest skips its own JSON parser when one is already applied.
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.use(translateBodyParserError);
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
    .addBearerAuth()
    .build();
  // useGlobalPrefix is off by default, so the docs stay at /api/docs.
  SwaggerModule.setup(DOCS_PATH, app, () =>
    SwaggerModule.createDocument(app, config),
  );
}

// body-parser errors are not HttpExceptions, so the filter would answer 500.
function translateBodyParserError(
  error: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const type =
    error instanceof Error ? (error as Error & { type?: string }).type : null;
  if (type === 'entity.parse.failed') {
    return next(new BadRequestException('Request body is not valid JSON.'));
  }
  if (type === 'entity.too.large') {
    return next(
      new PayloadTooLargeException(`Request body exceeds ${JSON_BODY_LIMIT}.`),
    );
  }
  next(error);
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
