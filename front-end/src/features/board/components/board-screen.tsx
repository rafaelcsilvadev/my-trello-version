import type { KeyboardEvent } from 'react';

import { LoadError } from '@/shared/ui/load-error';

import { useBoardViewModel } from '../view-models/use-board-view-model';
import { ArchivedBoardBanner } from './archived-board-banner';
import { BoardColumns } from './board-columns';
import { BoardHeader } from './board-header';
import { BoardNotFound } from './board-not-found';
import { BoardSkeleton } from './board-skeleton';
import { BoardToolbar } from './board-toolbar';
import { DeleteColumnDialog } from './delete-column-dialog';
import { DragOffNotice } from './drag-off-notice';
import { KeyboardHelp } from './keyboard-help';
import { MoveAnnouncer } from './move-announcer';
import { MoveBanner } from './move-banner';
import { MoveToDialog } from './move-to-dialog';
import { NoResults } from './no-results';

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
  const { deleteTarget, move, canMove } = state;
  const moveActions = actions.move;
  const keyboardSession = move.session?.input === 'keyboard';
  // A board without columns keeps its empty block (FBF-28).
  const noResults =
    state.isFiltering && state.matchCount === 0 && state.columns.length > 0;

  // Focus may leave the picked item, so Esc anywhere on the board cancels; the item handles its own (FDND-14).
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && keyboardSession && !event.defaultPrevented) {
      moveActions.cancel();
    }
  }

  return (
    // Catches the Esc that bubbles from any focusable child; it adds no key of its own.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="flex min-w-0 flex-col gap-3.5" onKeyDown={onKeyDown}>
      <BoardHeader board={board} />
      {state.readOnly ? (
        <ArchivedBoardBanner
          isPending={state.pendingIds.has(board.id)}
          onRestore={actions.restoreBoard}
        />
      ) : null}
      <BoardToolbar
        filters={state.filters}
        labels={state.labels}
        selectedLabelCount={state.selectedLabelCount}
        isFiltering={state.isFiltering}
        matchCount={state.matchCount}
        isSearchShortcutEnabled={!keyboardSession}
        showArchived={state.showArchived}
        onQueryChange={actions.filters.setQuery}
        onQueryClear={actions.filters.clearQuery}
        onLabelIdsChange={actions.filters.setLabelIds}
        onDueChange={actions.filters.setDue}
        onClearAll={actions.filters.clearAll}
        onShowArchivedChange={actions.setShowArchived}
      />
      {/* An archived board filters too, but has no drag to turn off (FBF-30, FBF-36). */}
      {canMove && state.isFiltering ? <DragOffNotice /> : null}
      {canMove ? <MoveAnnouncer text={move.announcement} /> : null}
      {move.banner !== null ? <MoveBanner text={move.banner} /> : null}
      {noResults ? (
        <NoResults onClear={actions.filters.clearAll} />
      ) : (
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
          isFiltered={state.isFiltering}
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
          move={
            canMove
              ? {
                  session: move.session,
                  preview: move.preview,
                  canDrag: state.canDrag,
                  onStart: moveActions.start,
                  onHover: moveActions.hover,
                  onStep: moveActions.step,
                  onDrop: moveActions.drop,
                  onCancel: moveActions.cancel,
                  onMoveTo: moveActions.askMoveTo,
                }
              : undefined
          }
        />
      )}
      {/* The help line explains drag, so it hides while drag is off (FBF-33). */}
      {state.canDrag && state.columns.length > 0 && !keyboardSession ? (
        <KeyboardHelp />
      ) : null}
      {/* Opens once the count loads, so the text never claims a wrong loss (FBV-40). */}
      {deleteTarget?.cardCount !== undefined ? (
        <DeleteColumnDialog
          list={deleteTarget.list}
          cardCount={deleteTarget.cardCount}
          onConfirm={actions.confirmDeleteList}
          onCancel={actions.cancelDelete}
        />
      ) : null}
      {move.moveToCard ? (
        <MoveToDialog
          card={move.moveToCard}
          lists={state.columns.map((column) => column.list)}
          onChoose={moveActions.moveTo}
          onClose={moveActions.closeMoveTo}
        />
      ) : null}
    </div>
  );
}
