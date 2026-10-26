import type { Board } from '@my-trello/api-contract';
import {
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import type { CreateBoardDto, UpdateBoardDto } from '../model/types';
import { boardKeys } from './keys';

// Shared by every optimistic board change, so each can see whether another is still pending.
export const BOARD_CHANGE_KEY = ['boards', 'change'] as const;

type BoardList = Board[];
type BoardListsPatch = {
  active?: (list: BoardList) => BoardList;
  archived?: (list: BoardList) => BoardList;
};
type BoardListsSnapshot = {
  active: BoardList | undefined;
  archived: BoardList | undefined;
};

export function useCreateBoard() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<Board, ApiError, CreateBoardDto>({
    mutationFn: (body) => call(api.POST('/api/v1/boards', { body })),
    // A new board is always active; the archived list cannot change.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: boardKeys.list(false) }),
  });
}

export type UpdateBoardVariables = { board: Board; body: UpdateBoardDto };

export function useUpdateBoard() {
  const api = useApi();

  return useOptimisticBoardChange<UpdateBoardVariables>(
    ({ board, body }) =>
      call(
        api.PATCH('/api/v1/boards/{id}', {
          params: { path: { id: board.id } },
          body,
        }),
      ),
    ({ board, body }) => ({
      active: (list) =>
        list.map((item) =>
          item.id === board.id ? { ...item, ...body } : item,
        ),
    }),
  );
}

export type BoardVariables = { board: Board };

export function useArchiveBoard() {
  const api = useApi();

  return useOptimisticBoardChange<BoardVariables>(
    ({ board }) =>
      call(
        api.POST('/api/v1/boards/{id}/archive', {
          params: { path: { id: board.id } },
        }),
      ),
    ({ board }) => ({ active: without(board) }),
  );
}

export function useRestoreBoard() {
  const api = useApi();

  return useOptimisticBoardChange<BoardVariables>(
    ({ board }) =>
      call(
        api.POST('/api/v1/boards/{id}/unarchive', {
          params: { path: { id: board.id } },
        }),
      ),
    ({ board }) => ({ archived: without(board) }),
  );
}

export function useDeleteBoard() {
  const api = useApi();

  return useOptimisticBoardChange<BoardVariables>(
    ({ board }) =>
      call(
        api.DELETE('/api/v1/boards/{id}', {
          params: { path: { id: board.id } },
        }),
      ),
    ({ board }) => ({ archived: without(board) }),
  );
}

// Ids of the boards with a change in flight, so their cards can block a second one (FBRD-42).
export function usePendingBoardIds(): Set<string> {
  const ids = useMutationState({
    filters: { mutationKey: BOARD_CHANGE_KEY, status: 'pending' },
    select: (mutation) => (mutation.state.variables as BoardVariables).board.id,
  });
  return new Set(ids);
}

function without(board: Board) {
  return (list: BoardList) => list.filter((item) => item.id !== board.id);
}

// TanStack Query optimistic recipe (FE-AD-009): patch the cached lists now,
// put the snapshot back on failure, refetch once no other change is in flight.
function useOptimisticBoardChange<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  patch: (variables: TVariables) => BoardListsPatch,
) {
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, TVariables, BoardListsSnapshot>({
    mutationKey: BOARD_CHANGE_KEY,
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.all });
      const snapshot: BoardListsSnapshot = {
        active: queryClient.getQueryData(boardKeys.list(false)),
        archived: queryClient.getQueryData(boardKeys.list(true)),
      };
      const { active, archived } = patch(variables);
      if (active) {
        queryClient.setQueryData<BoardList>(
          boardKeys.list(false),
          (list) => list && active(list),
        );
      }
      if (archived) {
        queryClient.setQueryData<BoardList>(
          boardKeys.list(true),
          (list) => list && archived(list),
        );
      }
      return snapshot;
    },
    onError: (_error, _variables, snapshot) => {
      if (!snapshot) return;
      queryClient.setQueryData(boardKeys.list(false), snapshot.active);
      queryClient.setQueryData(boardKeys.list(true), snapshot.archived);
    },
    // This mutation still counts as pending here, so 1 means it is the last one.
    onSettled: () =>
      queryClient.isMutating({ mutationKey: BOARD_CHANGE_KEY }) === 1
        ? queryClient.invalidateQueries({ queryKey: boardKeys.all })
        : undefined,
  });
}
