import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import type { Card } from '../model/types';
import { boardViewKeys } from './keys';

// The card as the board already shows it, active or archived, with the time it was loaded.
function seedFromBoard(
  queryClient: QueryClient,
  boardId: string,
  cardId: string,
) {
  for (const archived of [false, true]) {
    const key = boardViewKeys.cards(boardId, archived);
    const card = queryClient
      .getQueryData<Card[]>(key)
      ?.find((item) => item.id === cardId);
    if (card) {
      return { card, updatedAt: queryClient.getQueryState(key)?.dataUpdatedAt };
    }
  }
  return undefined;
}

export function useCardDetail(boardId: string, cardId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useQuery<Card, ApiError>({
    queryKey: boardViewKeys.card(boardId, cardId),
    queryFn: () =>
      call(api.GET('/api/v1/cards/{id}', { params: { path: { id: cardId } } })),
    // Opens at once from the board, then refetches: the seed is as old as its list.
    initialData: () => seedFromBoard(queryClient, boardId, cardId)?.card,
    initialDataUpdatedAt: () =>
      seedFromBoard(queryClient, boardId, cardId)?.updatedAt,
    // A closed detail keeps no copy; the next open seeds from the board again.
    gcTime: 0,
  });
}
