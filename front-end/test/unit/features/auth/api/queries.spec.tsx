import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentUser } from '@/features/auth/api/queries';
import type { UserResponse } from '@/features/auth/model/types';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const meUrl = `${baseUrl}/api/v1/me`;

const user: UserResponse = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  name: 'Ana',
  email: 'ana@example.com',
  createdAt: '2026-10-23T12:00:00.000Z',
};

beforeEach(() => {
  localStorage.clear();
});

function setup() {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  return { wrapper };
}

describe('useCurrentUser', () => {
  it('returns the name and e-mail from GET /api/v1/me', async () => {
    server.use(http.get(meUrl, () => HttpResponse.json(user)));
    const { wrapper } = setup();

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('Ana');
    expect(result.current.data?.email).toBe('ana@example.com');
  });

  it('exposes an ApiError when the request fails', async () => {
    server.use(
      http.get(meUrl, () =>
        HttpResponse.json(
          { type: '/problems/404', title: 'Error', status: 404, detail: '' },
          {
            status: 404,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
      ),
    );
    const { wrapper } = setup();

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBe(404);
  });
});
