import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/shared/api/api-error';
import { saveFailureKind } from '@/shared/api/save-failure';
import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';
import { useShortcut } from '@/shared/keyboard/use-shortcut';
import { useToast } from '@/shared/ui/toast/use-toast';

import { useArchivedListCounts } from '../api/archived-counts';
import { useCreateCard, useCreateList } from '../api/create-mutations';
import { boardViewKeys } from '../api/keys';
import {
  useArchiveList,
  useDeleteList,
  usePendingItemIds,
  useRenameList,
  useRestoreBoard,
  useRestoreList,
  useToggleCardDone,
} from '../api/mutations';
import { useBoard, useCards, useLabels, useLists } from '../api/queries';
import { toArchivedCards, toArchivedColumns } from '../model/archived';
import { toColumns } from '../model/columns';
import { todayParts } from '../model/due-date';
import { mapTitleServerError } from '../model/errors';
import type { Card, ItemFieldError, Label, List } from '../model/types';
import { validateCardTitle, validateColumnName } from '../model/validation';

export type BoardStatus = 'loading' | 'ready' | 'error' | 'notFound';

export type ArchivedStatus = 'loading' | 'ready' | 'error';

// The archived queries never change the board status (design: Screen status).
function archivedStatus(
  ...queries: { isError: boolean; isPending: boolean }[]
): ArchivedStatus {
  if (queries.some((q) => q.isError)) return 'error';
  return queries.some((q) => q.isPending) ? 'loading' : 'ready';
}

// The column whose name is a field. `value` and `error` reopen it after a `400` (FBV-57).
export type ColumnRename = {
  listId: string;
  value?: string;
  error?: ItemFieldError;
};

// A `400` on the title becomes a field message; anything else is left to the notifier.
function titleFieldError(
  err: ApiError,
  raw: string,
  kind: 'column' | 'card',
): ItemFieldError | null {
  return saveFailureKind(err) === 'invalid'
    ? mapTitleServerError(err, raw, kind)
    : null;
}

export function useBoardViewModel(boardId: string) {
  const board = useBoard(boardId);
  const lists = useLists(boardId, false);
  const cards = useCards(boardId, false);
  const labels = useLabels(boardId);
  const queries = [board, lists, cards, labels];
  // Off whenever the board opens, so nothing archived loads until it turns on (FBV-33).
  const [showArchived, setShowArchived] = useState(false);
  const archivedLists = useLists(boardId, true, { enabled: showArchived });
  const archivedCards = useCards(boardId, true, { enabled: showArchived });
  const archivedCounts = useArchivedListCounts(
    boardId,
    archivedLists.data ?? [],
    showArchived,
  );
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const createListMutation = useCreateList(boardId);
  const renameListMutation = useRenameList(boardId);
  const archiveListMutation = useArchiveList(boardId);
  const createCardMutation = useCreateCard(boardId);
  const toggleDoneMutation = useToggleCardDone(boardId);
  const restoreListMutation = useRestoreList(boardId);
  const deleteListMutation = useDeleteList(boardId);
  const restoreBoardMutation = useRestoreBoard(boardId);
  const pendingIds = usePendingItemIds();
  // The cache rollback is done by the mutation hooks; this only tells the user (FBV-53–FBV-55).
  const { notify, runChange } = useSaveFailureNotifier(
    () =>
      void queryClient.invalidateQueries({
        queryKey: boardViewKeys.all(boardId),
      }),
  );
  const [editing, setEditing] = useState<ColumnRename | null>(null);
  const [addingCardListId, setAddingCardListId] = useState<string | null>(null);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  // Read once, so the due labels do not change while the board is open.
  const [today] = useState(() => todayParts());

  const columns = useMemo(
    () => toColumns(lists.data ?? [], cards.data ?? []),
    [lists.data, cards.data],
  );
  // A card of an archived column needs that column's title too (FBV-35).
  const archivedCardItems = useMemo(
    () =>
      toArchivedCards(archivedCards.data ?? [], [
        ...(lists.data ?? []),
        ...(archivedLists.data ?? []),
      ]),
    [archivedCards.data, lists.data, archivedLists.data],
  );
  const archivedColumns = useMemo(
    () => toArchivedColumns(archivedLists.data ?? [], archivedCounts),
    [archivedLists.data, archivedCounts],
  );
  // Read from the section, so the dialog count fills in once it loads.
  const deleteTarget =
    archivedColumns.find(({ list }) => list.id === deleteListId) ?? null;
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
      const fieldError = titleFieldError(err, raw, 'column');
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
        const fieldError = titleFieldError(err, raw, 'column');
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

  // Same contract as `createList`; the field stays open for the next card (FBV-25).
  async function createCard(
    listId: string,
    raw: string,
  ): Promise<ItemFieldError | null> {
    const invalid = validateCardTitle(raw);
    if (invalid) return invalid;
    try {
      await createCardMutation.mutateAsync({
        listId,
        body: { title: raw.trim() },
      });
    } catch (error) {
      const err = error as ApiError;
      const fieldError = titleFieldError(err, raw, 'card');
      if (fieldError) return fieldError;
      notify(err, () => void createCard(listId, raw).catch(() => undefined));
      throw err;
    }
    toast.show({ message: t('board.toast.cardCreated') });
    return null;
  }

  // No success toast: the checkbox already shows the change (FBV-31).
  function toggleDone(card: Card) {
    const variables = { id: card.id, done: !card.done };
    const send = () => {
      toggleDoneMutation
        .mutateAsync(variables)
        .catch((err: ApiError) => notify(err, send));
    };
    send();
  }

  const readOnly = board.data !== undefined && board.data.archivedAt !== null;

  // FE-AD-011 guards live in the hook; this only adds the board's own (FBV-30, FBV-46).
  useShortcut('n', () => setAddingCardListId(columns[0].list.id), {
    enabled: status === 'ready' && !readOnly && columns.length > 0,
  });

  function confirmDeleteList() {
    if (!deleteListId) return;
    setDeleteListId(null);
    runChange(
      deleteListMutation.mutateAsync,
      { id: deleteListId },
      t('board.toast.columnDeleted'),
    );
  }

  return {
    state: {
      status,
      board: board.data,
      readOnly,
      columns,
      labelsById,
      showArchived,
      archived: {
        cards: archivedCardItems,
        columns: archivedColumns,
        cardsStatus: archivedStatus(archivedCards, archivedLists),
        columnsStatus: archivedStatus(archivedLists, archivedCards),
      },
      addingCardListId,
      editing,
      deleteTarget,
      pendingIds,
      isCreatingList: createListMutation.isPending,
      isCreatingCard: createCardMutation.isPending,
      today,
    },
    actions: {
      // Only the failed requests run again (FBV-10), the archived ones included.
      retryLoad: () => {
        for (const query of [...queries, archivedLists, archivedCards])
          if (query.isError) void query.refetch();
      },
      setShowArchived,
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
      openAddCard: (listId: string) => setAddingCardListId(listId),
      closeAddCard: () => setAddingCardListId(null),
      createCard,
      toggleDone,
      restoreList: (listId: string) =>
        runChange(
          restoreListMutation.mutateAsync,
          { id: listId },
          t('board.toast.columnRestored'),
        ),
      askDeleteList: (listId: string) => setDeleteListId(listId),
      confirmDeleteList,
      cancelDelete: () => setDeleteListId(null),
      restoreBoard: () =>
        runChange(
          restoreBoardMutation.mutateAsync,
          { id: boardId },
          t('board.toast.boardRestored'),
        ),
    },
  };
}
