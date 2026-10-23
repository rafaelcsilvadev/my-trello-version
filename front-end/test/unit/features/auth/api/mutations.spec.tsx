import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLogIn, useSignUp } from '@/features/auth/api/mutations';
import type { AuthResponse } from '@/features/auth/model/types';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';
import { SessionProvider } from '@/shared/session/session-context';
import { createSessionStore } from '@/shared/session/session-store';
import { createSafeStorage } from '@/shared/storage/safe-storage';

import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const registerUrl = `${baseUrl}/api/v1/auth/register`;
const loginUrl = `${baseUrl}/api/v1/auth/login`;

const credentials = { email: 'ana@example.com', password: 'secret-123' };
const signUpValues = { ...credentials, name: 'Ana' };

beforeEach(() => {
  localStorage.clear();
});

const authResponse: AuthResponse = {
  accessToken: 'new-token',
  user: {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    name: 'Ana',
    email: 'ana@example.com',
    createdAt: '2026-10-23T12:00:00.000Z',
  },
};

function setup(token?: string) {
  const session = createSessionStore(createSafeStorage());
  if (token !== undefined) {
    session.setToken(token);
  }
  const onSessionExpired = vi.fn<() => void>();
  const api = createApiClient({
    baseUrl,
    getToken: session.getToken,
    onSessionExpired,
  });
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>
        <SessionProvider store={session}>{children}</SessionProvider>
      </ApiProvider>
    </QueryClientProvider>
  );
  return { session, onSessionExpired, wrapper };
}

function problem(status: number) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

function respondWith(url: string, response: () => Response) {
  const body: { current: unknown } = { current: undefined };
  server.use(
    http.post(url, async ({ request }) => {
      body.current = await request.json();
      return response();
    }),
  );
  return body;
}

describe('useSignUp', () => {
  it('sends name, e-mail and password to the register endpoint', async () => {
    const body = respondWith(registerUrl, () =>
      HttpResponse.json(authResponse, { status: 201 }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useSignUp(), { wrapper });

    await act(() => result.current.mutateAsync(signUpValues));

    expect(body.current).toEqual(signUpValues);
  });

  it('stores the access token on 201', async () => {
    respondWith(registerUrl, () =>
      HttpResponse.json(authResponse, { status: 201 }),
    );
    const { session, wrapper } = setup();
    const { result } = renderHook(() => useSignUp(), { wrapper });

    act(() => result.current.mutate(signUpValues));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(session.getToken()).toBe('new-token');
  });

  it.each([409, 429])(
    'stores no token and exposes an ApiError on %i',
    async (status) => {
      respondWith(registerUrl, () => problem(status));
      const { session, wrapper } = setup();
      const { result } = renderHook(() => useSignUp(), { wrapper });

      act(() => result.current.mutate(signUpValues));

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect(result.current.error?.status).toBe(status);
      expect(session.getToken()).toBeNull();
    },
  );
});

describe('useLogIn', () => {
  it('sends e-mail and password to the login endpoint', async () => {
    const body = respondWith(loginUrl, () => HttpResponse.json(authResponse));
    const { wrapper } = setup();
    const { result } = renderHook(() => useLogIn(), { wrapper });

    await act(() => result.current.mutateAsync(credentials));

    expect(body.current).toEqual(credentials);
  });

  it('stores the access token on 200', async () => {
    respondWith(loginUrl, () => HttpResponse.json(authResponse));
    const { session, wrapper } = setup();
    const { result } = renderHook(() => useLogIn(), { wrapper });

    act(() => result.current.mutate(credentials));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(session.getToken()).toBe('new-token');
  });

  it.each([401, 429])(
    'stores no token and exposes an ApiError on %i',
    async (status) => {
      respondWith(loginUrl, () => problem(status));
      const { session, wrapper } = setup();
      const { result } = renderHook(() => useLogIn(), { wrapper });

      act(() => result.current.mutate(credentials));

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect(result.current.error?.status).toBe(status);
      expect(session.getToken()).toBeNull();
    },
  );

  it('does not expire the current session on a 401 (FND-15)', async () => {
    respondWith(loginUrl, () => problem(401));
    const { session, onSessionExpired, wrapper } = setup('old-token');
    const { result } = renderHook(() => useLogIn(), { wrapper });

    act(() => result.current.mutate(credentials));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(session.getToken()).toBe('old-token');
  });
});
