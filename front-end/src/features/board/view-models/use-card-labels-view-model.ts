import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/shared/api/api-error';
import { useToast } from '@/shared/ui/toast/use-toast';
import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';

import { useCreateLabel, useToggleCardLabel } from '../api/label-mutations';
import { boardViewKeys } from '../api/keys';
import { usePendingItemIds } from '../api/mutations';
import {
  DEFAULT_LABEL_COLOR,
  isLabelNameTaken,
  searchLabels,
  validateLabelName,
} from '../model/labels';
import type {
  Card,
  CreateLabelDto,
  ItemFieldError,
  Label,
} from '../model/types';

export type LabelOption = {
  label: Label;
  isChecked: boolean;
  isPending: boolean;
};

export type LabelForm = {
  name: string;
  color: Label['color'];
  error: ItemFieldError | null;
};

export function useCardLabelsViewModel(
  boardId: string,
  card: Card | undefined,
  labels: Label[],
) {
  const queryClient = useQueryClient();
  const toggleMutation = useToggleCardLabel(boardId);
  const createMutation = useCreateLabel(boardId);
  const { t } = useTranslation();
  const toast = useToast();
  const isSubmitting = useRef(false);
  const pendingIds = usePendingItemIds();
  const reload = () =>
    void queryClient.invalidateQueries({
      queryKey: boardViewKeys.all(boardId),
    });
  const { runChange, notify } = useSaveFailureNotifier(reload);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<LabelForm | null>(null);

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

  // Closing drops the search and the form so the next open starts clean
  // (FCLB-08, FCLB-11, FCLB-16).
  function setOpen(open: boolean) {
    setIsOpen(open);
    if (!open) {
      setQuery('');
      setForm(null);
    }
  }

  function startCreate() {
    setForm({ name: query, color: DEFAULT_LABEL_COLOR, error: null });
  }

  // Typing clears the error (FCLB-27).
  function setName(name: string) {
    setForm((current) => current && { ...current, name, error: null });
  }

  function setColor(color: Label['color']) {
    setForm((current) => current && { ...current, color });
  }

  function cancelCreate() {
    setForm(null);
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

  function create(body: CreateLabelDto) {
    isSubmitting.current = true;
    createMutation.mutateAsync(body).then(
      (label) => {
        isSubmitting.current = false;
        setForm(null);
        setQuery('');
        toast.show({ message: t('board.toast.labelCreated') });
        toggle(label);
      },
      (err: ApiError) => {
        isSubmitting.current = false;
        if (isLabelNameTaken(err)) {
          setForm(
            (current) => current && { ...current, error: 'labelNameTaken' },
          );
          void queryClient.invalidateQueries({
            queryKey: boardViewKeys.labels(boardId),
          });
          return;
        }
        notify(err, () => create(body));
      },
    );
  }

  // Validates against the labels the screen shows (FCLB-14, FCLB-15); a second
  // submit while one is in flight is ignored (FCLB-22).
  function submitCreate() {
    if (!form || isSubmitting.current) return;
    const error = validateLabelName(form.name, labels);
    if (error) {
      setForm({ ...form, error });
      return;
    }
    create({ name: form.name.trim(), color: form.color });
  }

  return {
    state: {
      isOpen,
      query,
      options,
      form,
      isCreating: createMutation.isPending,
    },
    actions: {
      setOpen,
      setQuery,
      toggle,
      startCreate,
      setName,
      setColor,
      cancelCreate,
      submitCreate,
    },
  };
}
