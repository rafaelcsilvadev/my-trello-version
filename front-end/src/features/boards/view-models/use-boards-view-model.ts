import type { Board } from '@my-trello/api-contract';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import type { ApiError } from '@/shared/api/api-error';
import { saveFailureKind } from '@/shared/api/save-failure';
import { useToast } from '@/shared/ui/toast/use-toast';

import { boardKeys } from '../api/keys';
import {
  useArchiveBoard,
  useCreateBoard,
  useDeleteBoard,
  usePendingBoardIds,
  useRestoreBoard,
  useUpdateBoard,
} from '../api/mutations';
import { useBoards } from '../api/queries';
import { mapBoardServerErrors } from '../model/errors';
import type {
  BoardFieldErrors,
  BoardFormValues,
  BoardsTab,
} from '../model/types';
import {
  toCreateBody,
  toUpdateBody,
  validateBoardForm,
} from '../model/validation';

export type BoardsDialog =
  | { kind: 'none' }
  | { kind: 'create'; values?: BoardFormValues; errors?: BoardFieldErrors }
  | {
      kind: 'edit';
      board: Board;
      values?: BoardFormValues;
      errors?: BoardFieldErrors;
    }
  | { kind: 'delete'; board: Board };

type BoardsViewModelOptions = { onCreated(id: string): void };

export function useBoardsViewModel({ onCreated }: BoardsViewModelOptions) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: BoardsTab =
    searchParams.get('archived') === 'true' ? 'archived' : 'active';
  const query = useBoards(tab === 'archived');
  const createBoard = useCreateBoard();
  const updateBoard = useUpdateBoard();
  const archiveBoard = useArchiveBoard();
  const restoreBoard = useRestoreBoard();
  const deleteBoard = useDeleteBoard();
  const pendingIds = usePendingBoardIds();
  const [dialog, setDialog] = useState<BoardsDialog>({ kind: 'none' });

  // The toast retry closes over `values`, so it resends the same body (FBRD-20).
  function submitCreate(values: BoardFormValues) {
    const errors = validateBoardForm(values);
    if (Object.keys(errors).length > 0) {
      setDialog({ kind: 'create', values, errors });
      return;
    }
    setDialog({ kind: 'create', values });
    createBoard.mutate(toCreateBody(values), {
      onSuccess: (board) => {
        setDialog({ kind: 'none' });
        toast.show({ message: t('boards.toast.created') });
        onCreated(board.id);
      },
      onError: (err) => {
        switch (saveFailureKind(err)) {
          case 'sessionExpired':
            return;
          case 'invalid':
            setDialog({
              kind: 'create',
              values,
              errors: mapBoardServerErrors(err, values) ?? undefined,
            });
            return;
          default:
            toast.show({
              message: t('errors.saveFail'),
              action: {
                label: t('errors.retry'),
                onClick: () => submitCreate(values),
              },
            });
        }
      },
    });
  }

  // The cache rollback is done by the mutation hooks; this only tells the user (FBRD-38–FBRD-40).
  function notifyFailure(err: ApiError, retry: () => void) {
    const reload = () =>
      void queryClient.invalidateQueries({ queryKey: boardKeys.all });
    switch (saveFailureKind(err)) {
      case 'sessionExpired':
        return;
      case 'conflict':
        toast.show({
          message: t('errors.conflict'),
          action: { label: t('errors.reload'), onClick: reload },
        });
        return;
      case 'notFound':
        toast.show({ message: t('errors.saveFail') });
        reload();
        return;
      default:
        toast.show({
          message: t('errors.saveFail'),
          action: { label: t('errors.retry'), onClick: retry },
        });
    }
  }

  // `mutateAsync`, not `mutate` with callbacks: those only run for the latest call,
  // so a second change started meanwhile would swallow the first one's toast.
  // Retries close over `variables`, not screen state, so they survive a tab switch.
  function runChange<TVariables>(
    mutateAsync: (variables: TVariables) => Promise<unknown>,
    variables: TVariables,
    successMessage: string,
  ) {
    mutateAsync(variables).then(
      () => toast.show({ message: successMessage }),
      (err: ApiError) =>
        notifyFailure(err, () =>
          runChange(mutateAsync, variables, successMessage),
        ),
    );
  }

  // The dialog closes before the request, since the cache patch already shows the change.
  function submitEdit(board: Board, values: BoardFormValues) {
    const errors = validateBoardForm(values);
    if (Object.keys(errors).length > 0) {
      setDialog({ kind: 'edit', board, values, errors });
      return;
    }
    setDialog({ kind: 'none' });
    const variables = { board, body: toUpdateBody(values) };
    updateBoard.mutateAsync(variables).then(
      () => toast.show({ message: t('boards.toast.saved') }),
      (err: ApiError) => {
        if (saveFailureKind(err) === 'invalid') {
          setDialog({
            kind: 'edit',
            board,
            values,
            errors: mapBoardServerErrors(err, values) ?? undefined,
          });
          return;
        }
        notifyFailure(err, () =>
          runChange(
            updateBoard.mutateAsync,
            variables,
            t('boards.toast.saved'),
          ),
        );
      },
    );
  }

  return {
    state: {
      tab,
      query,
      dialog,
      pendingIds,
      isCreating: createBoard.isPending,
    },
    actions: {
      selectTab: (next: BoardsTab) =>
        setSearchParams(next === 'archived' ? { archived: 'true' } : {}),
      retryLoad: () => void query.refetch(),
      openCreate: () => setDialog({ kind: 'create' }),
      openEdit: (board: Board) => setDialog({ kind: 'edit', board }),
      openDelete: (board: Board) => setDialog({ kind: 'delete', board }),
      closeDialog: () => setDialog({ kind: 'none' }),
      submitCreate,
      submitEdit,
      archive: (board: Board) =>
        runChange(
          archiveBoard.mutateAsync,
          { board },
          t('boards.toast.archived'),
        ),
      restore: (board: Board) =>
        runChange(
          restoreBoard.mutateAsync,
          { board },
          t('boards.toast.restored'),
        ),
      confirmDelete: (board: Board) => {
        setDialog({ kind: 'none' });
        runChange(
          deleteBoard.mutateAsync,
          { board },
          t('boards.toast.deleted'),
        );
      },
    },
  };
}
