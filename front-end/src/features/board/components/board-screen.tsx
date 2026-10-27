import { LoadError } from '@/shared/ui/load-error';

import { useBoardViewModel } from '../view-models/use-board-view-model';
import { ArchivedBoardBanner } from './archived-board-banner';
import { BoardColumns } from './board-columns';
import { BoardHeader } from './board-header';
import { BoardNotFound } from './board-not-found';
import { BoardSkeleton } from './board-skeleton';
import { BoardToolbar } from './board-toolbar';
import { DeleteColumnDialog } from './delete-column-dialog';

type BoardScreenProps = {
  boardId: string;
};

// Port of the prototype board screen (design/Task List.dc.html:298-520).
export function BoardScreen({ boardId }: BoardScreenProps) {
  const { state, actions } = useBoardViewModel(boardId);

  switch (state.status) {
    case 'loading':
      return <BoardSkeleton />;
    case 'error':
      return <LoadError onRetry={actions.retryLoad} />;
    case 'notFound':
      return <BoardNotFound />;
  }

  // `ready` means every always-on query has data.
  const board = state.board!;
  const { deleteTarget } = state;

  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <BoardHeader board={board} />
      {state.readOnly ? (
        <ArchivedBoardBanner
          isPending={state.pendingIds.has(board.id)}
          onRestore={actions.restoreBoard}
        />
      ) : null}
      <BoardToolbar
        showArchived={state.showArchived}
        onShowArchivedChange={actions.setShowArchived}
      />
      <BoardColumns
        columns={state.columns}
        labels={state.labelsById}
        today={state.today}
        isReadOnly={state.readOnly}
        pendingIds={state.pendingIds}
        editing={state.editing}
        addingCardListId={state.addingCardListId}
        isCreatingList={state.isCreatingList}
        isCreatingCard={state.isCreatingCard}
        showArchived={state.showArchived}
        archived={state.archived}
        onStartRename={actions.startRename}
        onSubmitRename={actions.submitRename}
        onCancelRename={actions.cancelRename}
        onArchive={actions.archiveList}
        onOpenAddCard={actions.openAddCard}
        onCloseAddCard={actions.closeAddCard}
        onCreateCard={actions.createCard}
        onToggleDone={actions.toggleDone}
        onCreateList={actions.createList}
        onRestoreList={actions.restoreList}
        onDeleteList={actions.askDeleteList}
        onRetryArchived={actions.retryLoad}
      />
      {/* Opens once the count loads, so the text never claims a wrong loss (FBV-40). */}
      {deleteTarget?.cardCount !== undefined ? (
        <DeleteColumnDialog
          list={deleteTarget.list}
          cardCount={deleteTarget.cardCount}
          onConfirm={actions.confirmDeleteList}
          onCancel={actions.cancelDelete}
        />
      ) : null}
    </div>
  );
}
