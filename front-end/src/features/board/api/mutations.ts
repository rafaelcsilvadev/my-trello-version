import {
  type QueryKey,
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import { byPosition } from '../model/columns';
import { type CardSpot, placeCard, placeList } from '../model/move';
import type {
  Board,
  Card,
  List,
  MoveCardDto,
  MoveListDto,
} from '../model/types';
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

export function useArchiveList(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<ItemVariables>(
    boardId,
    ({ id }) =>
      call(
        api.POST('/api/v1/lists/{id}/archive', { params: { path: { id } } }),
      ),
    ({ id }) => {
      const active = removal<List>((list) => list.id === id);
      return [
        { key: boardViewKeys.lists(boardId, false), ...active },
        {
          key: boardViewKeys.lists(boardId, true),
          apply: (lists: List[]) => {
            const list = active.removed()[0];
            return list
              ? [{ ...list, archivedAt: new Date().toISOString() }, ...lists]
              : lists;
          },
          revert: (lists: List[]) => lists.filter((list) => list.id !== id),
        },
      ];
    },
  );
}

export function useRestoreList(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<ItemVariables>(
    boardId,
    ({ id }) =>
      call(
        api.POST('/api/v1/lists/{id}/unarchive', { params: { path: { id } } }),
      ),
    ({ id }) => {
      const archived = removal<List>((list) => list.id === id);
      return [
        { key: boardViewKeys.lists(boardId, true), ...archived },
        {
          key: boardViewKeys.lists(boardId, false),
          apply: (lists: List[]) => {
            const list = archived.removed()[0];
            return list
              ? [
                  ...lists,
                  { ...list, archivedAt: null, position: lists.length },
                ]
              : lists;
          },
          revert: (lists: List[]) => lists.filter((list) => list.id !== id),
        },
      ];
    },
  );
}

export function useDeleteList(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<ItemVariables>(
    boardId,
    ({ id }) =>
      call(api.DELETE('/api/v1/lists/{id}', { params: { path: { id } } })),
    ({ id }) => [
      {
        key: boardViewKeys.lists(boardId, true),
        ...removal<List>((list) => list.id === id),
      },
      {
        key: boardViewKeys.cards(boardId, true),
        ...removal<Card>((card) => card.listId === id),
      },
    ],
  );
}

export type ToggleCardDoneVariables = ItemVariables & { done: boolean };

export function useToggleCardDone(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<ToggleCardDoneVariables>(
    boardId,
    ({ id, done }) =>
      call(
        api.PATCH('/api/v1/cards/{id}', {
          params: { path: { id } },
          body: { done },
        }),
      ),
    ({ id, done }) => {
      let previous: boolean | undefined;
      return [
        {
          key: boardViewKeys.cards(boardId, false),
          apply: (cards: Card[]) =>
            cards.map((card) => {
              if (card.id !== id) return card;
              previous = card.done;
              return { ...card, done };
            }),
          revert: (cards: Card[]) =>
            cards.map((card) =>
              card.id === id && previous !== undefined
                ? { ...card, done: previous }
                : card,
            ),
        },
      ];
    },
  );
}

export type MoveCardVariables = ItemVariables & { body: MoveCardDto };

// `listId` is absent when the card stays in its column (FDND-04).
export function useMoveCard(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<MoveCardVariables>(
    boardId,
    ({ id, body }) =>
      call(
        api.POST('/api/v1/cards/{id}/move', {
          params: { path: { id } },
          body,
        }),
      ),
    ({ id, body }) => {
      let previous: CardSpot | null = null;
      return [
        {
          key: boardViewKeys.cards(boardId, false),
          apply: (cards: Card[]) => {
            previous = activeCardSpot(cards, id);
            return previous
              ? placeCard(
                  cards,
                  id,
                  body.listId ?? previous.listId,
                  body.position,
                )
              : cards;
          },
          revert: (cards: Card[]) =>
            previous
              ? placeCard(cards, id, previous.listId, previous.index)
              : cards,
        },
      ];
    },
  );
}

export type MoveListVariables = ItemVariables & { body: MoveListDto };

export function useMoveList(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<MoveListVariables>(
    boardId,
    ({ id, body }) =>
      call(
        api.POST('/api/v1/lists/{id}/move', {
          params: { path: { id } },
          body,
        }),
      ),
    ({ id, body }) => {
      let previous = -1;
      return [
        {
          key: boardViewKeys.lists(boardId, false),
          apply: (lists: List[]) => {
            previous = activeListIndex(lists, id);
            return previous === -1
              ? lists
              : placeList(lists, id, body.position);
          },
          revert: (lists: List[]) =>
            previous === -1 ? lists : placeList(lists, id, previous),
        },
      ];
    },
  );
}

// `id` is the board itself, so its Restore button shows as pending (FBV-58).
export function useRestoreBoard(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<ItemVariables>(
    boardId,
    ({ id }) =>
      call(
        api.POST('/api/v1/boards/{id}/unarchive', {
          params: { path: { id } },
        }),
      ),
    () => {
      let previous: string | null = null;
      return [
        {
          key: boardViewKeys.detail(boardId),
          apply: (board: Board) => {
            previous = board.archivedAt;
            return { ...board, archivedAt: null };
          },
          revert: (board: Board) => ({ ...board, archivedAt: previous }),
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

// Where an active card sits among the active cards of its list.
function activeCardSpot(cards: Card[], id: string): CardSpot | null {
  const card = cards.find((item) => item.id === id && item.archivedAt === null);
  if (!card) return null;
  const index = cards
    .filter((item) => item.listId === card.listId && item.archivedAt === null)
    .sort(byPosition)
    .indexOf(card);
  return { listId: card.listId, index };
}

// Removes the matching items and remembers their indexes, so `revert` puts
// them back where they were unless a refetch already brought them back.
function removal<T extends { id: string }>(matches: (item: T) => boolean) {
  let removed: { index: number; item: T }[] = [];
  return {
    removed: () => removed.map(({ item }) => item),
    apply: (items: T[]) => {
      removed = items.flatMap((item, index) =>
        matches(item) ? [{ index, item }] : [],
      );
      return items.filter((item) => !matches(item));
    },
    revert: (items: T[]) => {
      const restored = [...items];
      for (const { index, item } of removed) {
        if (!restored.some(({ id }) => id === item.id)) {
          restored.splice(index, 0, item);
        }
      }
      return restored;
    },
  };
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

// Where an active list sits among the active lists.
function activeListIndex(lists: List[], id: string): number {
  return lists
    .filter((list) => list.archivedAt === null)
    .sort(byPosition)
    .findIndex((list) => list.id === id);
}
