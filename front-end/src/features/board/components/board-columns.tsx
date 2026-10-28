import { type DragEvent, useLayoutEffect, useRef, useState } from 'react';

import {
  type ArrowKey,
  type CardSpot,
  type ColumnSpot,
  type ColumnsPreview,
  columnDropSlot,
  type MoveInput,
  type MoveSession,
} from '../model/move';
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
import {
  BoardColumn,
  type ColumnCardDrop,
  type ColumnMove,
} from './board-column';
import type { CardMove } from './card-tile';
import { ColumnPager } from './column-pager';

// Matches `gap-3`, the phone gap; the pager is phone only.
const COLUMN_GAP = 12;

// Tailwind's `md`: from here up the columns sit side by side.
const SIDE_BY_SIDE = '(min-width: 48rem)';

export type BoardColumnsArchived = {
  cards: ArchivedCardItem[];
  columns: ArchivedColumnItem[];
  cardsStatus: ArchivedStatus;
  columnsStatus: ArchivedStatus;
};

// The board's move session and its actions (`useBoardMove`). `columns` is already `preview.columns`.
export type BoardColumnsMove = {
  session: MoveSession | null;
  preview: ColumnsPreview;
  onStart: (kind: MoveSession['kind'], id: string, input: MoveInput) => void;
  onHover: (target: CardSpot | ColumnSpot) => void;
  onStep: (key: ArrowKey) => void;
  onDrop: () => void;
  onCancel: () => void;
  onMoveTo: (cardId: string) => void;
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
  move?: BoardColumnsMove;
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
  move,
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

  const session = move?.session ?? null;
  const keyboardSession = session?.input === 'keyboard' ? session : null;
  // The last keyboard item, refocused while the board re-renders after the session (FDND-15).
  const focusItem = useRef<Pick<MoveSession, 'kind' | 'id'> | null>(null);
  // The column the phone layout last scrolled to for the keyboard session.
  const scrolledTo = useRef<number | null>(null);

  // A card that changes column is a new node, and a dropped card remounts again when its move is saved.
  useLayoutEffect(() => {
    if (keyboardSession) focusItem.current = keyboardSession;
    const item = focusItem.current;
    if (!item) return;
    // Focus elsewhere means the user moved it; after the session it also ends the refocus.
    if (document.activeElement !== document.body) {
      if (!keyboardSession) focusItem.current = null;
      return;
    }
    const attribute = item.kind === 'card' ? 'data-card-id' : 'data-column-id';
    scrollerRef.current
      ?.querySelector<HTMLElement>(`[${attribute}="${CSS.escape(item.id)}"]`)
      ?.focus();
  });

  // FDND-18: only a picked card scrolls; a dragged one follows the pointer.
  const scrollTarget =
    keyboardSession?.kind === 'card'
      ? columns.findIndex(
          (column) =>
            column.list.id ===
            (keyboardSession.target ?? keyboardSession.origin).listId,
        )
      : null;
  useLayoutEffect(() => {
    if (scrollTarget === null) {
      scrolledTo.current = null;
      return;
    }
    if (scrolledTo.current === null) {
      scrolledTo.current = scrollTarget;
      return;
    }
    if (scrolledTo.current === scrollTarget) return;
    scrolledTo.current = scrollTarget;
    if (!matchMedia(SIDE_BY_SIDE).matches) scrollToColumn(scrollTarget);
  }, [scrollTarget]);

  const columnDrag =
    session?.kind === 'column' && session.input === 'mouse' ? session : null;
  const cardDrag =
    session?.kind === 'card' && session.input === 'mouse' ? session : null;

  function columnMove(listId: string): ColumnMove | undefined {
    if (!move) return undefined;
    return {
      isSource: columnDrag?.id === listId,
      isLifted: move.preview.liftedId === listId,
      onDragStart: (id) => move.onStart('column', id, 'mouse'),
      onDragEnd: move.onCancel,
      onPick: (id) => move.onStart('column', id, 'keyboard'),
      onStep: move.onStep,
      onDrop: move.onDrop,
      onCancel: move.onCancel,
    };
  }

  function cardDrop(listId: string): ColumnCardDrop | undefined {
    if (!move || !cardDrag) return undefined;
    const { placeholder } = move.preview;
    return {
      cardId: cardDrag.id,
      targetIndex:
        cardDrag.target?.listId === listId ? cardDrag.target.index : null,
      placeholder:
        placeholder?.listId === listId
          ? { beforeCardId: placeholder.beforeCardId }
          : null,
      onHover: move.onHover,
      onDrop: move.onDrop,
    };
  }

  const cardMove = move
    ? (cardId: string): CardMove => ({
        isSource: move.preview.sourceCardId === cardId,
        isLifted: move.preview.liftedId === cardId,
        onDragStart: (id) => move.onStart('card', id, 'mouse'),
        onDragEnd: move.onCancel,
        onPick: (id) => move.onStart('card', id, 'keyboard'),
        onStep: move.onStep,
        onDrop: move.onDrop,
        onCancel: move.onCancel,
        onMoveTo: move.onMoveTo,
      })
    : undefined;

  // Only over an active column or the gaps between them: the archived column and section take no drop (FDND-43).
  function overActiveColumns(event: DragEvent<HTMLDivElement>) {
    const section =
      event.target instanceof Element ? event.target.closest('section') : null;
    return (
      section === null || section.querySelector('[data-column-id]') !== null
    );
  }

  // The slot is the count of other columns the pointer is right of the middle of (FDND-19).
  function onDragOver(event: DragEvent<HTMLDivElement>) {
    if (!move || !columnDrag || !overActiveColumns(event)) return;
    event.preventDefault();
    const headers = Array.from(
      scrollerRef.current?.querySelectorAll<HTMLElement>('[data-column-id]') ??
        [],
    );
    const index = headers.filter((header) => {
      const section = header.closest('section');
      return (
        header.dataset.columnId !== columnDrag.id &&
        section !== null &&
        columnDropSlot(section.getBoundingClientRect(), event.clientX) ===
          'after'
      );
    }).length;
    if (index !== columnDrag.target?.index) move.onHover({ index });
  }

  // FDND-20
  function onDrop(event: DragEvent<HTMLDivElement>) {
    if (!move || !columnDrag || !overActiveColumns(event)) return;
    event.preventDefault();
    move.onDrop();
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
        onDragOver={onDragOver}
        onDrop={onDrop}
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
              move={columnMove(listId)}
              cardDrop={cardDrop(listId)}
              cardMove={cardMove}
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
