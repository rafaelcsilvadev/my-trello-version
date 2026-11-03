import { useMemo, useState } from 'react';

import { searchLabels } from '../model/labels';
import type { Card, Label } from '../model/types';

export type LabelOption = { label: Label; isChecked: boolean };

export function useCardLabelsViewModel(
  _boardId: string,
  card: Card | undefined,
  labels: Label[],
) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const labelIds = card?.labelIds;
  const options = useMemo<LabelOption[]>(() => {
    const checked = new Set(labelIds);
    return searchLabels(labels, query).map((label) => ({
      label,
      isChecked: checked.has(label.id),
    }));
  }, [labels, labelIds, query]);

  // Closing drops the search so the next open lists every label (FCLB-08, FCLB-11).
  function setOpen(open: boolean) {
    setIsOpen(open);
    if (!open) setQuery('');
  }

  return {
    state: { isOpen, query, options },
    actions: { setOpen, setQuery },
  };
}
