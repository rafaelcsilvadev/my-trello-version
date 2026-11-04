import { useQuery } from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';
import type { ApiClient } from '@/shared/api/client';

import type { Board, Card, Label, List } from '../model/types';
import { boardViewKeys } from './keys';

type QueryOptions = { enabled?: boolean };

// The active items are the API default; only the archived ones send the flag.
function archivedQuery(archived: boolean) {
  return archived ? { archived: 'true' as const } : {};
}

export function useBoard(boardId: string) {
  const api = useApi();

  return useQuery<Board, ApiError>({
    queryKey: boardViewKeys.detail(boardId),
    queryFn: () =>
      call(
        api.GET('/api/v1/boards/{id}', { params: { path: { id: boardId } } }),
      ),
  });
}

export function useLists(
  boardId: string,
  archived: boolean,
  { enabled = true }: QueryOptions = {},
) {
  const api = useApi();

  return useQuery<List[], ApiError>({
    queryKey: boardViewKeys.lists(boardId, archived),
    queryFn: () =>
      call(
        api.GET('/api/v1/boards/{boardId}/lists', {
          params: { path: { boardId }, query: archivedQuery(archived) },
        }),
      ),
    enabled,
  });
}

export function useCards(
  boardId: string,
  archived: boolean,
  { enabled = true }: QueryOptions = {},
) {
  const api = useApi();

  return useQuery<Card[], ApiError>({
    queryKey: boardViewKeys.cards(boardId, archived),
    queryFn: () =>
      call(
        api.GET('/api/v1/boards/{boardId}/cards', {
          params: { path: { boardId }, query: archivedQuery(archived) },
        }),
      ),
    enabled,
  });
}

// A list's own endpoint returns only its active cards. Shared by every reader of
// `boardViewKeys.listCards`, so they all hit one cached response per list.
export function listCardsQuery(
  api: ApiClient,
  boardId: string,
  listId: string,
) {
  return {
    queryKey: boardViewKeys.listCards(boardId, listId),
    queryFn: (): Promise<Card[]> =>
      call(
        api.GET('/api/v1/lists/{listId}/cards', {
          params: { path: { listId } },
        }),
      ),
  };
}

export function useLabels(boardId: string) {
  const api = useApi();

  return useQuery<Label[], ApiError>({
    queryKey: boardViewKeys.labels(boardId),
    queryFn: () =>
      call(
        api.GET('/api/v1/boards/{boardId}/labels', {
          params: { path: { boardId } },
        }),
      ),
  });
}
