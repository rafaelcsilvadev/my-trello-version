import type { Board } from '@my-trello/api-contract';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { LoadError } from '@/shared/ui/load-error';
import { SegmentedTabs } from '@/shared/ui/tabs';

import type { BoardFormValues, BoardsTab } from '../model/types';
import {
  type BoardsDialog,
  useBoardsViewModel,
} from '../view-models/use-boards-view-model';
import { BoardCard } from './board-card';
import { BoardFormDialog } from './board-form-dialog';
import { BoardGrid } from './board-grid';
import { ActiveBoardsEmpty, ArchivedBoardsEmpty } from './boards-empty';
import { BoardsSkeleton } from './boards-skeleton';
import { DeleteBoardDialog } from './delete-board-dialog';

type BoardsScreenProps = {
  onCreated: (id: string) => void;
};

type ViewModel = ReturnType<typeof useBoardsViewModel>;

// Port of the prototype My boards screen (design/Task List.dc.html:199-262).
export function BoardsScreen({ onCreated }: BoardsScreenProps) {
  const { t } = useTranslation();
  const { state, actions } = useBoardsViewModel({ onCreated });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 font-display text-3xl leading-tight font-semibold tracking-tight text-text-primary">
          {t('routes.boards')}
        </h1>
        {state.tab === 'active' ? (
          <Button onPress={actions.openCreate}>
            <Plus size={16} aria-hidden />
            {t('boards.create')}
          </Button>
        ) : null}
      </div>
      <div>
        <SegmentedTabs
          label={t('routes.boards')}
          options={[
            { id: 'active', label: t('boards.tabs.active') },
            { id: 'archived', label: t('boards.tabs.archived') },
          ]}
          selected={state.tab}
          onChange={(id) => actions.selectTab(id as BoardsTab)}
        />
      </div>
      <BoardsContent state={state} actions={actions} />
      <BoardsDialogs
        dialog={state.dialog}
        isCreating={state.isCreating}
        actions={actions}
      />
    </div>
  );
}

function BoardsContent({ state, actions }: ViewModel) {
  const { tab, query, pendingIds } = state;

  if (query.isPending) {
    return <BoardsSkeleton />;
  }
  if (query.isError) {
    return <LoadError onRetry={actions.retryLoad} />;
  }
  if (query.data.length === 0) {
    return tab === 'active' ? (
      <ActiveBoardsEmpty onCreate={actions.openCreate} />
    ) : (
      <ArchivedBoardsEmpty />
    );
  }
  return (
    <BoardGrid>
      {query.data.map((board) => (
        <BoardCard
          key={board.id}
          board={board}
          tab={tab}
          isPending={pendingIds.has(board.id)}
          onEdit={actions.openEdit}
          onArchive={actions.archive}
          onRestore={actions.restore}
          onDelete={actions.openDelete}
        />
      ))}
    </BoardGrid>
  );
}

type BoardsDialogsProps = {
  dialog: BoardsDialog;
  isCreating: boolean;
  actions: ViewModel['actions'];
};

function BoardsDialogs({ dialog, isCreating, actions }: BoardsDialogsProps) {
  switch (dialog.kind) {
    case 'create':
      return (
        <BoardFormDialog
          mode="create"
          isOpen
          initialValues={dialog.values}
          serverErrors={dialog.errors}
          isPending={isCreating}
          onSubmit={actions.submitCreate}
          onClose={actions.closeDialog}
        />
      );
    case 'edit':
      return (
        <BoardFormDialog
          mode="edit"
          isOpen
          initialValues={dialog.values ?? formValuesOf(dialog.board)}
          serverErrors={dialog.errors}
          isPending={false}
          onSubmit={(values) => actions.submitEdit(dialog.board, values)}
          onClose={actions.closeDialog}
        />
      );
    case 'delete':
      return (
        <DeleteBoardDialog
          board={dialog.board}
          isOpen
          onConfirm={() => actions.confirmDelete(dialog.board)}
          onClose={actions.closeDialog}
        />
      );
    default:
      return null;
  }
}

function formValuesOf(board: Board): BoardFormValues {
  return { name: board.title, description: board.description ?? '' };
}
