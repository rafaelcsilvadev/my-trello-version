import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/shared/api/api-error';
import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';
import { useToast } from '@/shared/ui/toast/use-toast';

import { boardViewKeys } from '../api/keys';
import {
  useCreateLabel,
  useDeleteLabel,
  useUpdateLabel,
} from '../api/label-mutations';
import { useLabelUsage } from '../api/label-usage';
import { usePendingItemIds } from '../api/mutations';
import { useBoard, useLabels } from '../api/queries';
import { labelChanges, usageText } from '../model/label-usage';
import {
  DEFAULT_LABEL_COLOR,
  isLabelNameTaken,
  validateLabelName,
} from '../model/labels';
import type {
  CreateLabelDto,
  ItemFieldError,
  Label,
  UpdateLabelDto,
} from '../model/types';

export type LabelsStatus = 'loading' | 'ready' | 'error' | 'notFound';

type FormFields = {
  name: string;
  color: Label['color'];
  error: ItemFieldError | null;
  isSubmitting: boolean;
};

export type LabelsForm =
  | ({ mode: 'create' } & FormFields)
  | ({ mode: 'edit'; id: string } & FormFields);

export function useLabelsViewModel(boardId: string) {
  const board = useBoard(boardId);
  const labels = useLabels(boardId);
  const usage = useLabelUsage(boardId);
  const pendingIds = usePendingItemIds();
  const queryClient = useQueryClient();
  const createMutation = useCreateLabel(boardId);
  const updateMutation = useUpdateLabel(boardId);
  const deleteMutation = useDeleteLabel(boardId);
  const { t } = useTranslation();
  const toast = useToast();
  const { notify, runChange } = useSaveFailureNotifier(
    () =>
      void queryClient.invalidateQueries({
        queryKey: boardViewKeys.all(boardId),
      }),
  );
  const isSubmitting = useRef(false);
  const [form, setForm] = useState<LabelsForm | null>(null);
  // The count is read when the dialog opens, so it does not change under the user (FLP-23).
  const [confirmDelete, setConfirmDelete] = useState<{
    label: Label;
    count: number;
  } | null>(null);

  // Rows wait for every usage source, so a count shown is never partial (FLP-05).
  const rows = useMemo(() => {
    const { counts } = usage;
    if (!labels.data || !counts) return [];
    return labels.data.map((label) => ({
      label,
      usage: usageText(counts.get(label.id) ?? 0),
      pending: pendingIds.has(label.id),
    }));
  }, [labels.data, usage, pendingIds]);

  // A failed refetch keeps the cached data on screen; only a read with nothing to show is an error.
  let status: LabelsStatus = 'ready';
  if ([board, labels].some((q) => q.error?.status === 404)) status = 'notFound';
  else if (
    [board, labels].some((q) => q.isError && q.data === undefined) ||
    (usage.isError && usage.counts === undefined)
  )
    status = 'error';
  else if (board.isPending || labels.isPending || usage.isLoading)
    status = 'loading';

  function openCreate() {
    setForm({
      mode: 'create',
      name: '',
      color: DEFAULT_LABEL_COLOR,
      error: null,
      isSubmitting: false,
    });
  }

  function openEdit(id: string) {
    const label = labels.data?.find((item) => item.id === id);
    if (!label) return;
    setForm({
      mode: 'edit',
      id,
      name: label.name,
      color: label.color,
      error: null,
      isSubmitting: false,
    });
  }

  // Typing clears the error (FLP-15).
  function setName(name: string) {
    setForm((current) => current && { ...current, name, error: null });
  }

  function setColor(color: Label['color']) {
    setForm((current) => current && { ...current, color });
  }

  function closeForm() {
    setForm(null);
  }

  function setSubmitting(value: boolean) {
    isSubmitting.current = value;
    setForm((current) => current && { ...current, isSubmitting: value });
  }

  // Not optimistic: the label has no id until the API answers (FLP-29).
  function create(body: CreateLabelDto) {
    setSubmitting(true);
    createMutation.mutateAsync(body).then(
      () => {
        isSubmitting.current = false;
        setForm(null);
        toast.show({ message: t('board.toast.labelCreated') });
      },
      (err: ApiError) => {
        setSubmitting(false);
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

  // Optimistic: the form closes at once and the row shows the change (FLP-20).
  // A name taken elsewhere puts the row back and reopens the form (FLP-30).
  function update(
    id: string,
    body: UpdateLabelDto,
    typed: Pick<FormFields, 'name' | 'color'>,
  ) {
    updateMutation.mutateAsync({ id, body }).then(
      () => toast.show({ message: t('board.toast.labelSaved') }),
      (err: ApiError) => {
        if (isLabelNameTaken(err)) {
          setForm({
            mode: 'edit',
            id,
            ...typed,
            error: 'labelNameTaken',
            isSubmitting: false,
          });
          void queryClient.invalidateQueries({
            queryKey: boardViewKeys.labels(boardId),
          });
          return;
        }
        notify(err, () => update(id, body, typed));
      },
    );
  }

  function edit(current: Extract<LabelsForm, { mode: 'edit' }>) {
    const label = labels.data?.find((item) => item.id === current.id);
    // The label's own name is not a clash (FLP-19).
    const others = (labels.data ?? []).filter((item) => item.id !== current.id);
    const error = validateLabelName(current.name, others);
    if (error) {
      setForm({ ...current, error });
      return;
    }
    const changes = label && labelChanges(label, current.name, current.color);
    setForm(null);
    if (changes) {
      update(current.id, changes, {
        name: current.name,
        color: current.color,
      });
    }
  }

  // A second submit while one is in flight is ignored (FLP-17).
  function submit() {
    if (!form || isSubmitting.current) return;
    if (form.mode === 'edit') {
      edit(form);
      return;
    }
    const error = validateLabelName(form.name, labels.data ?? []);
    if (error) {
      setForm({ ...form, error });
      return;
    }
    create({ name: form.name.trim(), color: form.color });
  }

  function openDelete(id: string) {
    const label = labels.data?.find((item) => item.id === id);
    if (!label) return;
    setConfirmDelete({ label, count: usage.counts?.get(id) ?? 0 });
  }

  function closeDelete() {
    setConfirmDelete(null);
  }

  // Optimistic: the row leaves at once and a failure puts it back (FLP-24).
  function confirmDeletion() {
    if (!confirmDelete) return;
    const { id } = confirmDelete.label;
    setConfirmDelete(null);
    runChange(
      deleteMutation.mutateAsync,
      { id },
      t('board.toast.labelDeleted'),
    );
  }

  return {
    state: {
      form,
      confirmDelete,
      status,
      board: board.data,
      readOnly: board.data !== undefined && board.data.archivedAt !== null,
      rows,
    },
    actions: {
      openCreate,
      openEdit,
      setName,
      setColor,
      closeForm,
      submit,
      openDelete,
      closeDelete,
      confirmDelete: confirmDeletion,
      // Only the failed requests run again (FLP-06).
      retry: () => {
        for (const query of [board, labels])
          if (query.isError) void query.refetch();
        usage.refetch();
      },
    },
  };
}
