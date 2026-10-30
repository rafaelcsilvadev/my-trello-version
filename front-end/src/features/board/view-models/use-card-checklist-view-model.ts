import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { ApiError } from '@/shared/api/api-error';
import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';

import { useCreateChecklistItem } from '../api/checklist-mutations';
import { useChecklistItems } from '../api/checklist-queries';
import { boardViewKeys } from '../api/keys';
import { checklistProgress } from '../model/checklist';
import type { ChecklistItem, ItemFieldError } from '../model/types';
import { validateChecklistItemText } from '../model/validation';

export type CardChecklistStatus = 'loading' | 'error' | 'ready';

// `target` is `'new'` for the add field, or the id of the item being edited.
export type ChecklistFieldError = {
  target: 'new' | string;
  code: ItemFieldError;
};

const noItems: ChecklistItem[] = [];

export function useCardChecklistViewModel(boardId: string, cardId: string) {
  const query = useChecklistItems(boardId, cardId);
  const queryClient = useQueryClient();
  const createMutation = useCreateChecklistItem(boardId, cardId);
  const { notify } = useSaveFailureNotifier(
    () =>
      void queryClient.invalidateQueries({
        queryKey: boardViewKeys.all(boardId),
      }),
  );
  const [newText, setNewText] = useState('');
  const [error, setError] = useState<ChecklistFieldError | null>(null);
  const items = query.data ?? noItems;
  const progress = useMemo(() => checklistProgress(items), [items]);

  // A failed refetch keeps the items shown; only a first load without data is an error (FCL-03).
  let status: CardChecklistStatus = 'ready';
  if (query.isError && query.data === undefined) status = 'error';
  else if (query.isPending) status = 'loading';

  // The text stays in the field until the create succeeds (FCL-38), and is cleared
  // only if the user has not typed something else meanwhile.
  function create(raw: string) {
    createMutation.mutateAsync({ text: raw.trim() }).then(
      () => setNewText((current) => (current === raw ? '' : current)),
      (err: ApiError) => notify(err, () => create(raw)),
    );
  }

  function add() {
    // One Enter makes one item (FCL-11).
    if (createMutation.isPending) return;
    const invalid = validateChecklistItemText(newText);
    if (invalid) {
      setError({ target: 'new', code: invalid });
      return;
    }
    create(newText);
  }

  return {
    query,
    state: {
      status,
      items,
      progress,
      newText,
      isCreating: createMutation.isPending,
      error,
    },
    actions: {
      retryLoad: () => void query.refetch(),
      setNewText: (text: string) => {
        setNewText(text);
        // Typing clears only the add field's error (FCL-15).
        setError((current) => (current?.target === 'new' ? null : current));
      },
      add,
    },
  };
}
