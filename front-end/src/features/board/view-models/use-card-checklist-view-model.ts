import { useMemo } from 'react';

import { useChecklistItems } from '../api/checklist-queries';
import { checklistProgress } from '../model/checklist';
import type { ChecklistItem } from '../model/types';

export type CardChecklistStatus = 'loading' | 'error' | 'ready';

const noItems: ChecklistItem[] = [];

export function useCardChecklistViewModel(boardId: string, cardId: string) {
  const query = useChecklistItems(boardId, cardId);
  const items = query.data ?? noItems;
  const progress = useMemo(() => checklistProgress(items), [items]);

  // A failed refetch keeps the items shown; only a first load without data is an error (FCL-03).
  let status: CardChecklistStatus = 'ready';
  if (query.isError && query.data === undefined) status = 'error';
  else if (query.isPending) status = 'loading';

  return {
    query,
    state: { status, items, progress },
    actions: {
      retryLoad: () => void query.refetch(),
    },
  };
}
