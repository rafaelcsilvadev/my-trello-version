import type { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/api-error';
import { createQueryClient } from '@/shared/api/query-client';

function apiError(status: number) {
  return new ApiError({
    status,
    type: 'about:blank',
    title: 'Error',
    detail: '',
  });
}

function failingFn(err: unknown) {
  return vi.fn<() => Promise<never>>(() => Promise.reject(err));
}

let client: QueryClient;

function noDelayClient() {
  client = createQueryClient();
  client.setDefaultOptions({
    ...client.getDefaultOptions(),
    queries: { ...client.getDefaultOptions().queries, retryDelay: 0 },
    mutations: { ...client.getDefaultOptions().mutations, retryDelay: 0 },
  });
  return client;
}

afterEach(() => {
  client.clear();
});

describe('createQueryClient', () => {
  describe('queries', () => {
    it.each([400, 401, 404, 409, 499])(
      'does not retry an ApiError %i',
      async (status) => {
        const queryFn = failingFn(apiError(status));

        await expect(
          noDelayClient().fetchQuery({ queryKey: ['q', status], queryFn }),
        ).rejects.toBeInstanceOf(ApiError);

        expect(queryFn).toHaveBeenCalledTimes(1);
      },
    );

    it.each([0, 500, 503])(
      'retries an ApiError %i three times',
      async (status) => {
        const queryFn = failingFn(apiError(status));

        await expect(
          noDelayClient().fetchQuery({ queryKey: ['q', status], queryFn }),
        ).rejects.toBeInstanceOf(ApiError);

        expect(queryFn).toHaveBeenCalledTimes(4);
      },
    );

    it('retries an error that is not an ApiError three times', async () => {
      const queryFn = failingFn(new TypeError('boom'));

      await expect(
        noDelayClient().fetchQuery({ queryKey: ['q', 'type-error'], queryFn }),
      ).rejects.toBeInstanceOf(TypeError);

      expect(queryFn).toHaveBeenCalledTimes(4);
    });
  });

  describe('mutations', () => {
    it.each([0, 404, 500])('does not retry an ApiError %i', async (status) => {
      const mutationFn = failingFn(apiError(status));

      await expect(
        noDelayClient()
          .getMutationCache()
          .build(client, { mutationFn })
          .execute(undefined),
      ).rejects.toBeInstanceOf(ApiError);

      expect(mutationFn).toHaveBeenCalledTimes(1);
    });
  });
});
