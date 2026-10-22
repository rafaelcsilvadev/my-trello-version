import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { ApiError, call } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';

import { server } from '../../../support/msw/server';

const baseUrl = 'http://api.test';

const invalidCredentials = {
  type: '/problems/invalid-credentials',
  title: 'Unauthorized',
  status: 401,
  detail: 'Invalid e-mail or password',
};

function setup(token: string | null) {
  const onSessionExpired = vi.fn<() => void>();
  const client = createApiClient({
    baseUrl,
    getToken: () => token,
    onSessionExpired,
  });
  return { client, onSessionExpired };
}

function respondWith(
  method: 'get' | 'post',
  path: string,
  status: number,
  body: unknown = invalidCredentials,
) {
  server.use(
    http[method](`${baseUrl}${path}`, () =>
      HttpResponse.json(body as never, {
        status,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    ),
  );
}

const credentials = { email: 'ana@example.com', password: 'secret-123' };
const signUp = { ...credentials, name: 'Ana' };

describe('createApiClient', () => {
  it('sends Authorization: Bearer <token> to the base URL when a token is stored', async () => {
    let authorization: string | null = 'unset';
    server.use(
      http.get(`${baseUrl}/api/v1/me`, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({});
      }),
    );
    const { client } = setup('t1');

    await client.GET('/api/v1/me');

    expect(authorization).toBe('Bearer t1');
  });

  it('sends no Authorization header when no token is stored', async () => {
    let authorization: string | null = 'unset';
    server.use(
      http.get(`${baseUrl}/api/v1/me`, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({});
      }),
    );
    const { client } = setup(null);

    await client.GET('/api/v1/me');

    expect(authorization).toBeNull();
  });

  it('reports a session expiry once on 401 of an authenticated request', async () => {
    respondWith('get', '/api/v1/boards', 401);
    const { client, onSessionExpired } = setup('t1');

    await client.GET('/api/v1/boards');

    expect(onSessionExpired).toHaveBeenCalledOnce();
  });

  it('does not report a session expiry on 401 of a request without a token', async () => {
    respondWith('get', '/api/v1/boards', 401);
    const { client, onSessionExpired } = setup(null);

    await client.GET('/api/v1/boards');

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it.each([
    ['log-in', '/api/v1/auth/login', 't1'],
    ['log-in', '/api/v1/auth/login', null],
    ['sign-up', '/api/v1/auth/register', 't1'],
    ['sign-up', '/api/v1/auth/register', null],
  ] as const)(
    'returns the %s 401 to the caller without a session expiry (path %s, token %s)',
    async (_name, path, token) => {
      respondWith('post', path, 401);
      const { client, onSessionExpired } = setup(token);

      const request =
        path === '/api/v1/auth/login'
          ? client.POST(path, { body: credentials })
          : client.POST(path, { body: signUp });
      const err = await call(request).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).type).toBe('/problems/invalid-credentials');
      expect(onSessionExpired).not.toHaveBeenCalled();
    },
  );

  it.each([403, 404, 500])(
    'does not report a session expiry on %i of an authenticated request',
    async (status) => {
      respondWith('get', '/api/v1/boards', status, {
        type: 'about:blank',
        title: 'Error',
        status,
        detail: '',
      });
      const { client, onSessionExpired } = setup('t1');

      await client.GET('/api/v1/boards');

      expect(onSessionExpired).not.toHaveBeenCalled();
    },
  );
});

// Compile-time checks: typecheck fails if these stop being errors (FND-11).
export function typedPathsAndBodies(
  client: ReturnType<typeof createApiClient>,
) {
  // @ts-expect-error undeclared path
  void client.GET('/api/v1/nope');
  // @ts-expect-error wrong body type
  void client.POST('/api/v1/boards', { body: { title: 1 } });
}
