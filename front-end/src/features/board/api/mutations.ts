import {
  type QueryKey,
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import type { List } from '../model/types';
import { boardViewKeys } from './keys';

// Shared by every optimistic board change, so each can see whether another is still pending.
export const BOARD_VIEW_CHANGE_KEY = ['board', 'change'] as const;

// `id` is the list, card or board being changed (FBV-58).
type ItemVariables = { id: string };

// One patch on one cached query (FE-AD-010). `apply` may remember the old
// values it overwrites, so `revert` puts back only this item.
type CacheChange = {
  key: QueryKey;
  apply: (data: never) => unknown;
  revert: (data: never) => unknown;
};

export type RenameListVariables = ItemVariables & { title: string };

export function useRenameList(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<RenameListVariables>(
    boardId,
    ({ id, title }) =>
      call(
        api.PATCH('/api/v1/lists/{id}', {
          params: { path: { id } },
          body: { title },
        }),
      ),
    ({ id, title }) => {
      let previous: string | undefined;
      return [
        {
          key: boardViewKeys.lists(boardId, false),
          apply: (lists: List[]) =>
            lists.map((list) => {
              if (list.id !== id) return list;
              previous = list.title;
              return { ...list, title };
            }),
          revert: (lists: List[]) =>
            lists.map((list) =>
              list.id === id && previous !== undefined
                ? { ...list, title: previous }
                : list,
            ),
        },
      ];
    },
  );
}

// Ids of the lists and cards with a change in flight, so their controls can block a second one (FBV-58).
export function usePendingItemIds(): Set<string> {
  const ids = useMutationState({
    filters: { mutationKey: BOARD_VIEW_CHANGE_KEY, status: 'pending' },
    select: (mutation) => (mutation.state.variables as ItemVariables).id,
  });
  return new Set(ids);
}

// TanStack Query optimistic recipe with per-item revert (FE-AD-010): patch the
// cached queries now, undo only this change on failure, refetch the board once
// no other change is in flight.
function useOptimisticBoardViewChange<TVariables extends ItemVariables>(
  boardId: string,
  mutationFn: (variables: TVariables) => Promise<unknown>,
  change: (variables: TVariables) => CacheChange[],
) {
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, TVariables, CacheChange[]>({
    mutationKey: BOARD_VIEW_CHANGE_KEY,
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: boardViewKeys.all(boardId),
      });
      const changes = change(variables);
      for (const { key, apply } of changes) {
        queryClient.setQueryData(key, (data: never) => data && apply(data));
      }
      return changes;
    },
    onError: (_error, _variables, changes) => {
      for (const { key, revert } of changes ?? []) {
        queryClient.setQueryData(key, (data: never) => data && revert(data));
      }
    },
    // This mutation still counts as pending here, so 1 means it is the last one.
    onSettled: () =>
      queryClient.isMutating({ mutationKey: BOARD_VIEW_CHANGE_KEY }) === 1
        ? queryClient.invalidateQueries({
            queryKey: boardViewKeys.all(boardId),
          })
        : undefined,
  });
}
