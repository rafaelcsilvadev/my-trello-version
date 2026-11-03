import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';

import { useToggleCardLabel } from '../api/label-mutations';
import { boardViewKeys } from '../api/keys';
import { usePendingItemIds } from '../api/mutations';
import { searchLabels } from '../model/labels';
import type { Card, Label } from '../model/types';

export type LabelOption = {
  label: Label;
  isChecked: boolean;
  isPending: boolean;
};

export function useCardLabelsViewModel(
  boardId: string,
  card: Card | undefined,
  labels: Label[],
) {
  const queryClient = useQueryClient();
  const toggleMutation = useToggleCardLabel(boardId);
  const pendingIds = usePendingItemIds();
  const reload = () =>
    void queryClient.invalidateQueries({
      queryKey: boardViewKeys.all(boardId),
    });
  const { runChange } = useSaveFailureNotifier(reload);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const labelIds = card?.labelIds;
  const options = useMemo<LabelOption[]>(() => {
    const checked = new Set(labelIds);
    return searchLabels(labels, query).map((label) => ({
      label,
      isChecked: checked.has(label.id),
      isPending: pendingIds.has(label.id),
    }));
    // `pendingIds` is a new Set on every render; its content is what matters.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [labels, labelIds, query, [...pendingIds].join()]);

  // Closing drops the search so the next open lists every label (FCLB-08, FCLB-11).
  function setOpen(open: boolean) {
    setIsOpen(open);
    if (!open) setQuery('');
  }

  // No success toast: the checkbox already shows the change (FCLB-07).
  function toggle(label: Label) {
    if (!card) return;
    const isChecked = card.labelIds.includes(label.id);
    runChange(
      toggleMutation.mutateAsync,
      { id: label.id, cardId: card.id, applied: !isChecked },
      null,
    );
  }

  return {
    state: { isOpen, query, options },
    actions: { setOpen, setQuery, toggle },
  };
}
