import { useQuery } from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import { sortItems } from '../model/checklist';
import type { ChecklistItem } from '../model/types';
import { boardViewKeys } from './keys';

export function useChecklistItems(boardId: string, cardId: string) {
  const api = useApi();

  return useQuery<ChecklistItem[], ApiError>({
    queryKey: boardViewKeys.checklist(boardId, cardId),
    queryFn: () =>
      call(
        api.GET('/api/v1/cards/{cardId}/checklist-items', {
          params: { path: { cardId } },
        }),
      ),
    select: sortItems,
    // A closed detail keeps no copy, like the card query.
    gcTime: 0,
  });
}
