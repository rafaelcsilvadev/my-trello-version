import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/api-error';

const MAX_QUERY_RETRIES = 3;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A 4xx will fail the same way again; network errors (status 0) and 5xx may not.
        retry: (failureCount, error) =>
          !isClientError(error) && failureCount < MAX_QUERY_RETRIES,
      },
      mutations: { retry: false },
    },
  });
}

function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}
