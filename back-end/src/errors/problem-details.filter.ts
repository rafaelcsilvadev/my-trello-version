import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { buildProblem, type FieldError } from './problem-details';
import { RequestValidationException } from './validation.exception';

const UNEXPECTED_ERROR_DETAIL = 'An unexpected error occurred.';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const problem = buildProblem({
      ...describe(exception),
      instance: req.originalUrl.split('?')[0],
      // genReqId (pino-http, first middleware) always assigns a string id.
      requestId: req.id as string,
    });

    if (!(exception instanceof HttpException)) {
      req.log.error({ err: exception }, 'Unhandled exception');
    }

    res
      .status(problem.status)
      .type('application/problem+json')
      .send(JSON.stringify(problem));
  }
}

function describe(exception: unknown): {
  status: number;
  detail: string;
  errors?: FieldError[];
} {
  if (exception instanceof RequestValidationException) {
    return {
      status: exception.getStatus(),
      detail: exception.message,
      errors: exception.fieldErrors,
    };
  }
  if (exception instanceof HttpException) {
    return { status: exception.getStatus(), detail: exception.message };
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: UNEXPECTED_ERROR_DETAIL,
  };
}
