import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { pino, type DestinationStream } from 'pino';
import { pinoHttp, type HttpLogger } from 'pino-http';
import type { Env } from '../config/env.schema';
import { redactLogLine } from './redact-passwords';
import { genReqId } from './request-id';

export const LOG_DESTINATION = Symbol('LOG_DESTINATION');
export const HTTP_LOGGER = Symbol('HTTP_LOGGER');

@Module({
  imports: [
    LoggerModule.forRootAsync({
      providers: [
        { provide: LOG_DESTINATION, useFactory: () => pino.destination(1) },
        {
          provide: HTTP_LOGGER,
          inject: [ConfigService, LOG_DESTINATION],
          useFactory: (
            config: ConfigService<Env, true>,
            destination: DestinationStream,
          ): HttpLogger =>
            pinoHttp({
              logger: pino(
                {
                  level: config.get('LOG_LEVEL', { infer: true }),
                  redact: {
                    paths: ['req.headers.authorization'],
                    censor: '[REDACTED]',
                  },
                  hooks: { streamWrite: redactLogLine },
                },
                destination,
              ),
              genReqId,
              quietReqLogger: true,
              customAttributeKeys: { reqId: 'requestId' },
            }),
        },
      ],
      inject: [HTTP_LOGGER],
      // configureApp mounts HTTP_LOGGER ahead of every other middleware, so
      // nestjs-pino only binds the request context instead of mounting its own.
      useFactory: (httpLogger: HttpLogger) => ({
        pinoHttp: { logger: httpLogger.logger },
        useExisting: true,
      }),
    }),
  ],
})
export class LoggingModule {}
