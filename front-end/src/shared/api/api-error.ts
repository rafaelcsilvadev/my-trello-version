export type FieldError = { field: string; message: string };

// Mirrors back-end/src/errors/problem-details.ts; the API contract does not type error bodies.
export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  requestId?: string;
  errors?: FieldError[];
};

export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  readonly title: string;
  readonly detail: string;
  readonly errors?: FieldError[];
  readonly requestId?: string;

  constructor(problem: Omit<ProblemDetails, 'instance'>) {
    super(problem.detail || problem.title);
    this.name = 'ApiError';
    this.status = problem.status;
    this.type = problem.type;
    this.title = problem.title;
    this.detail = problem.detail;
    this.errors = problem.errors;
    this.requestId = problem.requestId;
  }
}

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

export async function call<T>(request: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await request;
  } catch {
    throw new ApiError({
      status: 0,
      type: 'about:blank',
      title: 'Network error',
      detail: '',
    });
  }

  const { data, error, response } = result;
  if (response.ok) {
    return data as T;
  }
  if (isProblemDetails(error)) {
    throw new ApiError(error);
  }
  throw new ApiError({
    status: response.status,
    type: 'about:blank',
    title: response.statusText,
    detail: '',
  });
}

export function isProblemType(err: unknown, type: string): boolean {
  return err instanceof ApiError && err.type === type;
}

function isProblemDetails(body: unknown): body is ProblemDetails {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { type?: unknown }).type === 'string' &&
    typeof (body as { status?: unknown }).status === 'number'
  );
}
