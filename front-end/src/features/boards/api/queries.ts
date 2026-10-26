import type { Board } from '@my-trello/api-contract';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import { boardKeys } from './keys';

export function useBoards(archived: boolean) {
  const api = useApi();

  return useQuery<Board[], ApiError>({
    queryKey: boardKeys.list(archived),
    // The active list is the API default; only the archived list sends the flag.
    queryFn: () =>
      call(
        api.GET('/api/v1/boards', {
          params: { query: archived ? { archived: 'true' } : {} },
        }),
      ),
  });
}
