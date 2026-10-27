import { useRef, useState } from 'react';

import { visibleIndex } from '../model/pager';
import type {
  ArchivedCardItem,
  ArchivedColumnItem,
  Card,
  Column,
  DateParts,
  ItemFieldError,
  Label,
  List,
} from '../model/types';
import type {
  ArchivedStatus,
  ColumnRename,
} from '../view-models/use-board-view-model';
import { AddColumn } from './add-column';
import { ArchivedCardsColumn } from './archived-cards-column';
import { ArchivedColumnsSection } from './archived-columns-section';
import { BoardColumn } from './board-column';
import { ColumnPager } from './column-pager';

// Matches `gap-3`, the phone gap; the pager is phone only.
const COLUMN_GAP = 12;

export type BoardColumnsArchived = {
  cards: ArchivedCardItem[];
  columns: ArchivedColumnItem[];
  cardsStatus: ArchivedStatus;
  columnsStatus: ArchivedStatus;
};

type BoardColumnsProps = {
  columns: Column[];
  labels: ReadonlyMap<string, Label>;
  today: DateParts;
  isReadOnly: boolean;
  pendingIds: ReadonlySet<string>;
  editing: ColumnRename | null;
  addingCardListId: string | null;
  isCreatingList: boolean;
  isCreatingCard: boolean;
  showArchived: boolean;
  archived: BoardColumnsArchived;
  onStartRename: (listId: string) => void;
  onSubmitRename: (list: List, raw: string) => ItemFieldError | null;
  onCancelRename: () => void;
  onArchive: (listId: string) => void;
  onOpenAddCard: (listId: string) => void;
  onCloseAddCard: () => void;
  onCreateCard: (listId: string, raw: string) => Promise<ItemFieldError | null>;
  onToggleDone: (card: Card) => void;
  onCreateList: (raw: string) => Promise<ItemFieldError | null>;
  onRestoreList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onRetryArchived: () => void;
};

// Port of the prototype board columns and pager (design/Task List.dc.html:383-520).
// Phone: one column per screen with snap; the pager follows the column in view (FBV-48–FBV-50).
export function BoardColumns({
  columns,
  labels,
  today,
  isReadOnly,
  pendingIds,
  editing,
  addingCardListId,
  isCreatingList,
  isCreatingCard,
  showArchived,
  archived,
  onStartRename,
  onSubmitRename,
  onCancelRename,
  onArchive,
  onOpenAddCard,
  onCloseAddCard,
  onCreateCard,
  onToggleDone,
  onCreateList,
  onRestoreList,
  onDeleteList,
  onRetryArchived,
}: BoardColumnsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  // Archiving a column may leave the pager past the end.
  const pageInView = Math.min(page, Math.max(columns.length - 1, 0));

  function columnWidth(scroller: HTMLDivElement) {
    return (
      scroller.querySelector('section')?.clientWidth ?? scroller.clientWidth
    );
  }

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setPage(
      visibleIndex(
        scroller.scrollLeft,
        columnWidth(scroller),
        COLUMN_GAP,
        columns.length,
      ),
    );
  }

  function scrollToColumn(index: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({
      left: index * (columnWidth(scroller) + COLUMN_GAP),
      behavior: 'smooth',
    });
  }

  // A board without active columns shows only the first-column block (FBV-13).
  if (columns.length === 0 && !showArchived) {
    return isReadOnly ? null : (
      <AddColumn
        isEmptyBoard
        isPending={isCreatingList}
        onSubmit={onCreateList}
      />
    );
  }

  return (
    <>
      <div
        ref={scrollerRef}
        data-testid="board-columns"
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto p-0.5 pb-3 md:snap-none md:gap-3.5"
      >
        {columns.map((column) => {
          const listId = column.list.id;
          return (
            <BoardColumn
              key={listId}
              column={column}
              labels={labels}
              today={today}
              isReadOnly={isReadOnly}
              pendingIds={pendingIds}
              rename={editing?.listId === listId ? editing : null}
              isAddingCard={addingCardListId === listId}
              isCreatingCard={isCreatingCard}
              onStartRename={() => onStartRename(listId)}
              onSubmitRename={(raw) => onSubmitRename(column.list, raw)}
              onCancelRename={onCancelRename}
              onArchive={() => onArchive(listId)}
              onOpenAddCard={() => onOpenAddCard(listId)}
              onCloseAddCard={onCloseAddCard}
              onCreateCard={(raw) => onCreateCard(listId, raw)}
              onToggleDone={onToggleDone}
            />
          );
        })}
        {showArchived ? (
          <>
            <ArchivedCardsColumn
              items={archived.cards}
              status={archived.cardsStatus}
              labels={labels}
              today={today}
              onRetry={onRetryArchived}
            />
            <ArchivedColumnsSection
              items={archived.columns}
              status={archived.columnsStatus}
              isReadOnly={isReadOnly}
              pendingIds={pendingIds}
              onRestore={onRestoreList}
              onDelete={onDeleteList}
              onRetry={onRetryArchived}
            />
          </>
        ) : null}
        {isReadOnly ? null : (
          <AddColumn
            isEmptyBoard={false}
            isPending={isCreatingList}
            onSubmit={onCreateList}
          />
        )}
      </div>
      <ColumnPager
        titles={columns.map((column) => column.list.title)}
        index={pageInView}
        onSelect={scrollToColumn}
      />
    </>
  );
}
