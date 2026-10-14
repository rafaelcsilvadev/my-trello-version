import { STATUS_CODES } from 'node:http';

export type FieldError = { field: string; message: string };

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId: string;
  errors?: FieldError[];
};

export function buildProblem(input: {
  status: number;
  detail: string;
  instance: string;
  requestId: string;
  errors?: FieldError[];
  type?: string;
}): ProblemDetails {
  const { errors, type = 'about:blank', ...rest } = input;
  const problem: ProblemDetails = {
    type,
    title: STATUS_CODES[input.status] ?? 'Unknown Status',
    ...rest,
  };
  if (errors) {
    problem.errors = errors;
  }
  return problem;
}
