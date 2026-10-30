import {
  type QueryKey,
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import type { Card, CreateCardDto, CreateListDto, List } from '../model/types';
import { boardViewKeys } from './keys';

// Not optimistic: the item has no id until the API answers (FBV-14).
export function useCreateList(boardId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<List, ApiError, CreateListDto>({
    mutationFn: (body) =>
      call(
        api.POST('/api/v1/boards/{boardId}/lists', {
          params: { path: { boardId } },
          body,
        }),
      ),
    onSuccess: (list) =>
      appendThenInvalidate(
        queryClient,
        boardViewKeys.lists(boardId, false),
        list,
      ),
  });
}

export type CreateCardVariables = { listId: string; body: CreateCardDto };

// Not optimistic, like `useCreateList` (FBV-25).
export function useCreateCard(boardId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<Card, ApiError, CreateCardVariables>({
    mutationFn: ({ listId, body }) =>
      call(
        api.POST('/api/v1/lists/{listId}/cards', {
          params: { path: { listId } },
          body,
        }),
      ),
    onSuccess: (card) =>
      appendThenInvalidate(
        queryClient,
        boardViewKeys.cards(boardId, false),
        card,
      ),
  });
}

// Shows the item at once, then refetches to pick up the server order.
export function appendThenInvalidate<TItem>(
  queryClient: QueryClient,
  key: QueryKey,
  item: TItem,
) {
  queryClient.setQueryData<TItem[]>(key, (items) => items && [...items, item]);
  return queryClient.invalidateQueries({ queryKey: key });
}
