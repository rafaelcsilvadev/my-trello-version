import { describe, expect, it } from 'vitest';

import { ApiError, call, isProblemType } from '@/shared/api/api-error';

function failure(status: number, error: unknown, statusText = '') {
  return Promise.resolve({
    error,
    response: new Response(null, { status, statusText }),
  });
}

async function rejection(request: Promise<unknown>): Promise<ApiError> {
  const err = await request.then(
    () => {
      throw new Error('expected the request to reject');
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  return err as ApiError;
}

const conflict = {
  type: '/problems/email-taken',
  title: 'Conflict',
  status: 409,
  detail: 'E-mail already registered',
  instance: '/api/v1/auth/register',
  requestId: 'req-1',
};

describe('call', () => {
  it('resolves the data of a successful response', async () => {
    const data = { id: 'b1', name: 'Board' };

    const result = await call(
      Promise.resolve({ data, response: new Response(null, { status: 200 }) }),
    );

    expect(result).toBe(data);
  });

  it('rejects with the Problem Details of a 409 response', async () => {
    const err = await rejection(call(failure(409, conflict)));

    expect(err).toMatchObject({
      status: 409,
      type: '/problems/email-taken',
      title: 'Conflict',
      detail: 'E-mail already registered',
      requestId: 'req-1',
    });
    expect(err.errors).toBeUndefined();
  });

  it('keeps the field errors of a 400 Problem Details body', async () => {
    const errors = [{ field: 'name', message: 'name is required' }];

    const err = await rejection(
      call(
        failure(400, {
          ...conflict,
          type: '/problems/validation',
          status: 400,
          title: 'Bad Request',
          errors,
        }),
      ),
    );

    expect(err.status).toBe(400);
    expect(err.errors).toEqual(errors);
  });

  it('maps a 500 HTML body to about:blank with the HTTP status', async () => {
    const err = await rejection(
      call(
        failure(500, '<html>Internal error</html>', 'Internal Server Error'),
      ),
    );

    expect(err).toMatchObject({
      status: 500,
      type: 'about:blank',
      title: 'Internal Server Error',
    });
  });

  it('maps a JSON body without type to about:blank with the HTTP status', async () => {
    const err = await rejection(
      call(failure(502, { message: 'bad gateway' }, 'Bad Gateway')),
    );

    expect(err).toMatchObject({ status: 502, type: 'about:blank' });
  });

  it('maps a rejected fetch to status 0 and about:blank', async () => {
    const err = await rejection(
      call(Promise.reject(new TypeError('Failed to fetch'))),
    );

    expect(err).toMatchObject({ status: 0, type: 'about:blank' });
  });
});

describe('isProblemType', () => {
  const err = new ApiError({
    status: 409,
    type: '/problems/email-taken',
    title: 'Conflict',
    detail: '',
  });

  it('is true for an ApiError of the given type', () => {
    expect(isProblemType(err, '/problems/email-taken')).toBe(true);
  });

  it('is false for an ApiError of another type', () => {
    expect(isProblemType(err, '/problems/invalid-credentials')).toBe(false);
  });

  it('is false for an error that is not an ApiError', () => {
    expect(isProblemType(new Error('boom'), '/problems/email-taken')).toBe(
      false,
    );
  });
});
