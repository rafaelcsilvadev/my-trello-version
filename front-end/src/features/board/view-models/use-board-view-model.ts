import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/shared/api/api-error';
import { saveFailureKind } from '@/shared/api/save-failure';
import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';
import { useToast } from '@/shared/ui/toast/use-toast';

import { useCreateList } from '../api/create-mutations';
import { boardViewKeys } from '../api/keys';
import { useArchiveList, useRenameList } from '../api/mutations';
import { useBoard, useCards, useLabels, useLists } from '../api/queries';
import { toColumns } from '../model/columns';
import { todayParts } from '../model/due-date';
import { mapTitleServerError } from '../model/errors';
import type { ItemFieldError, Label, List } from '../model/types';
import { validateColumnName } from '../model/validation';

export type BoardStatus = 'loading' | 'ready' | 'error' | 'notFound';

// The column whose name is a field. `value` and `error` reopen it after a `400` (FBV-57).
export type ColumnRename = {
  listId: string;
  value?: string;
  error?: ItemFieldError;
};

// A `400` on the title becomes a field message; anything else is left to the notifier.
function titleFieldError(err: ApiError, raw: string): ItemFieldError | null {
  return saveFailureKind(err) === 'invalid'
    ? mapTitleServerError(err, raw, 'column')
    : null;
}

export function useBoardViewModel(boardId: string) {
  const board = useBoard(boardId);
  const lists = useLists(boardId, false);
  const cards = useCards(boardId, false);
  const labels = useLabels(boardId);
  const queries = [board, lists, cards, labels];
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const createListMutation = useCreateList(boardId);
  const renameListMutation = useRenameList(boardId);
  const archiveListMutation = useArchiveList(boardId);
  // The cache rollback is done by the mutation hooks; this only tells the user (FBV-53–FBV-55).
  const { notify, runChange } = useSaveFailureNotifier(
    () =>
      void queryClient.invalidateQueries({
        queryKey: boardViewKeys.all(boardId),
      }),
  );
  const [editing, setEditing] = useState<ColumnRename | null>(null);
  // Read once, so the due labels do not change while the board is open.
  const [today] = useState(() => todayParts());

  const columns = useMemo(
    () => toColumns(lists.data ?? [], cards.data ?? []),
    [lists.data, cards.data],
  );
  const labelsById = useMemo(
    () => new Map<string, Label>(labels.data?.map((l) => [l.id, l]) ?? []),
    [labels.data],
  );

  // A deleted board also makes its lists and cards answer 404 (FBV-11).
  let status: BoardStatus = 'ready';
  if (queries.some((q) => q.error?.status === 404)) status = 'notFound';
  else if (queries.some((q) => q.isError)) status = 'error';
  else if (queries.some((q) => q.isPending)) status = 'loading';

  // Resolves `null` once created, or the field message; rejects after toasting
  // any other failure, so the field keeps the text (FBV-56). The toast retry resends the same title.
  async function createList(raw: string): Promise<ItemFieldError | null> {
    const invalid = validateColumnName(raw);
    if (invalid) return invalid;
    try {
      await createListMutation.mutateAsync({ title: raw.trim() });
    } catch (error) {
      const err = error as ApiError;
      const fieldError = titleFieldError(err, raw);
      if (fieldError) return fieldError;
      notify(err, () => void createList(raw).catch(() => undefined));
      throw err;
    }
    toast.show({ message: t('board.toast.columnCreated') });
    return null;
  }

  // The field closes before the request, since the cache patch already shows the new name.
  function submitRename(list: List, raw: string): ItemFieldError | null {
    const invalid = validateColumnName(raw);
    if (invalid) return invalid;
    setEditing(null);
    const title = raw.trim();
    if (title === list.title) return null;
    const variables = { id: list.id, title };
    const renamed = t('board.toast.columnRenamed');
    renameListMutation.mutateAsync(variables).then(
      () => toast.show({ message: renamed }),
      (err: ApiError) => {
        const fieldError = titleFieldError(err, raw);
        if (fieldError) {
          setEditing({ listId: list.id, value: raw, error: fieldError });
          return;
        }
        notify(err, () =>
          runChange(renameListMutation.mutateAsync, variables, renamed),
        );
      },
    );
    return null;
  }

  return {
    state: {
      status,
      board: board.data,
      readOnly: board.data !== undefined && board.data.archivedAt !== null,
      columns,
      labelsById,
      editing,
      isCreatingList: createListMutation.isPending,
      today,
    },
    actions: {
      // Only the failed requests run again (FBV-10).
      retryLoad: () => {
        for (const query of queries) if (query.isError) void query.refetch();
      },
      createList,
      startRename: (listId: string) => setEditing({ listId }),
      submitRename,
      cancelRename: () => setEditing(null),
      archiveList: (listId: string) =>
        runChange(
          archiveListMutation.mutateAsync,
          { id: listId },
          t('board.toast.columnArchived'),
        ),
    },
  };
}
