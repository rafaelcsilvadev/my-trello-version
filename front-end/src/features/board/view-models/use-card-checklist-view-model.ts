import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { ApiError } from '@/shared/api/api-error';
import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';

import {
  useCreateChecklistItem,
  useUpdateChecklistItem,
} from '../api/checklist-mutations';
import { useChecklistItems } from '../api/checklist-queries';
import { boardViewKeys } from '../api/keys';
import { usePendingItemIds } from '../api/mutations';
import { checklistProgress, type ItemDrafts } from '../model/checklist';
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
  const updateMutation = useUpdateChecklistItem(boardId, cardId);
  const pendingIds = usePendingItemIds();
  const { notify, runChange } = useSaveFailureNotifier(
    () =>
      void queryClient.invalidateQueries({
        queryKey: boardViewKeys.all(boardId),
      }),
  );
  const [newText, setNewText] = useState('');
  const [drafts, setDrafts] = useState<ItemDrafts>({});
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

  // No success toast: the checkbox already shows the change (FCL-16).
  function toggle(id: string) {
    const item = items.find((current) => current.id === id);
    if (!item) return;
    runChange(
      updateMutation.mutateAsync,
      { id, body: { done: !item.done } },
      null,
    );
  }

  function putDraft(id: string, text: string) {
    setDrafts((current) => ({ ...current, [id]: text }));
  }

  function dropDraft(id: string) {
    setDrafts(({ [id]: _dropped, ...rest }) => rest);
  }

  function clearErrorOf(target: string) {
    setError((current) => (current?.target === target ? null : current));
  }

  // Follows the card title: the draft clears before the request, since the cache
  // patch already shows the text; a failed save puts the typed text back (FCL-37).
  function submitDraft(id: string) {
    const item = items.find((current) => current.id === id);
    const raw = drafts[id];
    if (!item || raw === undefined) return;
    const invalid = validateChecklistItemText(raw);
    if (invalid) {
      setError({ target: id, code: invalid });
      return;
    }
    dropDraft(id);
    clearErrorOf(id);
    const text = raw.trim();
    // Unchanged text sends nothing (FCL-19).
    if (text === item.text) return;
    const variables = { id, body: { text } };
    updateMutation.mutateAsync(variables).catch((err: ApiError) => {
      putDraft(id, raw);
      notify(err, () => runChange(updateMutation.mutateAsync, variables, null));
    });
  }

  return {
    query,
    state: {
      status,
      items,
      progress,
      drafts,
      newText,
      isCreating: createMutation.isPending,
      error,
      pendingIds,
    },
    actions: {
      retryLoad: () => void query.refetch(),
      setNewText: (text: string) => {
        setNewText(text);
        // Typing clears only the add field's error (FCL-15).
        clearErrorOf('new');
      },
      add,
      toggle,
      setDraft: (id: string, text: string) => {
        putDraft(id, text);
        clearErrorOf(id);
      },
      submitDraft,
      // Esc restores the saved text (FCL-22).
      cancelDraft: (id: string) => {
        dropDraft(id);
        clearErrorOf(id);
      },
    },
  };
}
