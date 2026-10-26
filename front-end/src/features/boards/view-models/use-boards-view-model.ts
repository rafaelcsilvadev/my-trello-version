import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { useToast } from '@/shared/ui/toast/use-toast';

import { useCreateBoard } from '../api/mutations';
import { useBoards } from '../api/queries';
import { mapBoardServerErrors, saveFailureKind } from '../model/errors';
import type {
  BoardFieldErrors,
  BoardFormValues,
  BoardsTab,
} from '../model/types';
import { toCreateBody, validateBoardForm } from '../model/validation';

export type BoardsDialog =
  | { kind: 'none' }
  | { kind: 'create'; values?: BoardFormValues; errors?: BoardFieldErrors };

type BoardsViewModelOptions = { onCreated(id: string): void };

export function useBoardsViewModel({ onCreated }: BoardsViewModelOptions) {
  const { t } = useTranslation();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: BoardsTab =
    searchParams.get('archived') === 'true' ? 'archived' : 'active';
  const query = useBoards(tab === 'archived');
  const createBoard = useCreateBoard();
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

  return {
    state: { tab, query, dialog, isCreating: createBoard.isPending },
    actions: {
      selectTab: (next: BoardsTab) =>
        setSearchParams(next === 'archived' ? { archived: 'true' } : {}),
      retryLoad: () => void query.refetch(),
      openCreate: () => setDialog({ kind: 'create' }),
      closeDialog: () => setDialog({ kind: 'none' }),
      submitCreate,
    },
  };
}
