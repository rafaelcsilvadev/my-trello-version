import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { FieldError } from './problem-details';

export class RequestValidationException extends BadRequestException {
  constructor(readonly fieldErrors: FieldError[]) {
    super('Request validation failed.');
  }
}

export function validationExceptionFactory(
  errors: ValidationError[],
): RequestValidationException {
  return new RequestValidationException(flatten(errors, ''));
}

function flatten(errors: ValidationError[], parentPath: string): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [...own, ...flatten(error.children ?? [], field)];
  });
}
