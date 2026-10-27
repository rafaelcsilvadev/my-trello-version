import { useQueries } from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { call } from '@/shared/api/api-error';

import type { Card, List } from '../model/types';
import { boardViewKeys } from './keys';
import { useCards } from './queries';

// A list's own endpoint returns only its active cards; its archived ones come
// from the board's archived cards, which the archived column loads anyway.
export function useArchivedListCounts(
  boardId: string,
  lists: List[],
  enabled: boolean,
): Map<string, number | undefined> {
  const api = useApi();
  const archivedCards = useCards(boardId, true, { enabled });
  const activeCards = useQueries({
    queries: lists.map((list) => ({
      queryKey: boardViewKeys.listCards(boardId, list.id),
      queryFn: (): Promise<Card[]> =>
        call(
          api.GET('/api/v1/lists/{listId}/cards', {
            params: { path: { listId: list.id } },
          }),
        ),
      enabled,
    })),
  });

  return new Map(
    lists.map((list, index) => {
      const active = activeCards[index]?.data;
      const archived = archivedCards.data;
      const count =
        active && archived
          ? active.length +
            archived.filter((card) => card.listId === list.id).length
          : undefined;
      return [list.id, count];
    }),
  );
}
