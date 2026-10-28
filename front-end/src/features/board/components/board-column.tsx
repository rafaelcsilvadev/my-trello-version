import { Archive, Loader, Pencil, Plus } from 'lucide-react';
import type { DragEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { ActionMenu } from '@/shared/ui/menu';

import type { ArrowKey } from '../model/move';
import type {
  Card,
  Column,
  DateParts,
  ItemFieldError,
  Label,
} from '../model/types';
import type { ColumnRename } from '../view-models/use-board-view-model';
import { ARROW_KEYS, CardTile } from './card-tile';
import { ColumnRenameField } from './column-rename-field';
import { InlineCreateField } from './inline-create-field';

// The column's part in a move session, through its header (FDND-19, FDND-22). Ignored on read-only boards.
export type ColumnMove = {
  isSource: boolean;
  isLifted: boolean;
  onDragStart: (listId: string) => void;
  onDragEnd: () => void;
  onPick: (listId: string) => void;
  onStep: (key: ArrowKey) => void;
  onDrop: () => void;
  onCancel: () => void;
};

type BoardColumnProps = {
  column: Column;
  labels: ReadonlyMap<string, Label>;
  today: DateParts;
  isReadOnly: boolean;
  pendingIds: ReadonlySet<string>;
  // This column's rename, or `null` while its name is not a field.
  rename: ColumnRename | null;
  isAddingCard: boolean;
  isCreatingCard: boolean;
  onStartRename: () => void;
  onSubmitRename: (raw: string) => ItemFieldError | null;
  onCancelRename: () => void;
  onArchive: () => void;
  onOpenAddCard: () => void;
  onCloseAddCard: () => void;
  onCreateCard: (raw: string) => Promise<ItemFieldError | null>;
  onToggleDone: (card: Card) => void;
  move?: ColumnMove;
};

// Port of the prototype column (design/Task List.dc.html:385-452).
export function BoardColumn({
  column: { list, cards },
  labels,
  today,
  isReadOnly,
  pendingIds,
  rename,
  isAddingCard,
  isCreatingCard,
  onStartRename,
  onSubmitRename,
  onCancelRename,
  onArchive,
  onOpenAddCard,
  onCloseAddCard,
  onCreateCard,
  onToggleDone,
  move,
}: BoardColumnProps) {
  const { t } = useTranslation();
  const isPending = pendingIds.has(list.id);
  // An archived board keeps its names, adds and menus out of reach (FBV-45).
  const canEdit = !isReadOnly;
  const movable = canEdit ? move : undefined;
  // A column being renamed or saved stays put (FDND-27, FDND-40).
  const canLift = !isPending && rename === null;

  // Only keys pressed on the header itself, so the name and menu buttons keep Space (FDND-26).
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!movable || event.target !== event.currentTarget) return;
    if (!movable.isLifted) {
      if (event.key !== ' ' || !canLift) return;
      event.preventDefault();
      movable.onPick(list.id);
    } else if (ARROW_KEYS.has(event.key)) {
      event.preventDefault();
      movable.onStep(event.key as ArrowKey);
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      movable.onDrop();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      movable.onCancel();
    }
  }

  // Firefox starts a drag only with data set.
  function onDragStart(event: DragEvent<HTMLDivElement>) {
    if (!canLift) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', list.id);
    event.dataTransfer.effectAllowed = 'move';
    movable?.onDragStart(list.id);
  }

  return (
    <section
      aria-label={list.title}
      className={`flex w-11/12 flex-none snap-start flex-col gap-2 rounded-lg bg-surface-sunken p-2 transition md:w-71 ${columnState(movable)}`}
    >
      <div
        {...(movable
          ? {
              role: 'button',
              tabIndex: 0,
              'aria-label': t('board.move.columnHandle', { name: list.title }),
              'data-column-id': list.id,
              draggable: canLift,
              onDragStart,
              onDragEnd: movable.onDragEnd,
              onKeyDown,
            }
          : {})}
        className={`relative flex min-h-8 items-center gap-1.5 pl-1 ${movable ? `rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-focus ${canLift ? 'cursor-grab' : 'cursor-default'}` : ''}`}
      >
        {rename !== null && canEdit ? (
          <ColumnRenameField
            initial={rename.value ?? list.title}
            initialError={rename.error}
            onSubmit={onSubmitRename}
            onCancel={onCancelRename}
          />
        ) : canEdit ? (
          <button
            type="button"
            onClick={onStartRename}
            title={t('board.column.rename')}
            className="min-w-0 flex-1 cursor-text truncate rounded-sm bg-transparent px-1 py-1.25 text-left text-md font-semibold text-text-primary hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            {list.title}
          </button>
        ) : (
          <span className="min-w-0 flex-1 truncate px-1 py-1.25 text-md font-semibold text-text-primary">
            {list.title}
          </span>
        )}
        <span className="inline-flex h-5 min-w-5.5 items-center justify-center rounded-xs bg-surface-card px-1.5 text-xs font-medium text-text-secondary">
          {cards.length}
        </span>
        {isPending ? (
          <span
            title={t('board.card.pending')}
            className="inline-flex flex-none text-text-tertiary"
          >
            <Loader
              size={14}
              className="motion-safe:animate-spin"
              aria-hidden
            />
            <span className="sr-only">{t('board.card.pending')}</span>
          </span>
        ) : null}
        {canEdit ? (
          <ActionMenu
            label={t('board.column.menu')}
            isDisabled={isPending}
            items={[
              {
                id: 'rename',
                label: t('board.column.rename'),
                icon: Pencil,
                onAction: onStartRename,
              },
              {
                id: 'archive',
                label: t('board.column.archive'),
                icon: Archive,
                onAction: onArchive,
              },
            ]}
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <CardTile
            key={card.id}
            card={card}
            labels={labels}
            today={today}
            mode="active"
            isPending={pendingIds.has(card.id)}
            isReadOnly={isReadOnly}
            onToggleDone={onToggleDone}
          />
        ))}
        {cards.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-default px-3 py-4.5 text-center text-sm text-text-tertiary">
            {t(isReadOnly ? 'board.column.empty' : 'board.column.dropHere')}
          </div>
        ) : null}
      </div>
      {canEdit && isAddingCard ? (
        <InlineCreateField
          label={t('board.column.add')}
          placeholder={t('board.column.cardTitle')}
          isPending={isCreatingCard}
          onSubmit={onCreateCard}
          onClose={onCloseAddCard}
        />
      ) : null}
      {canEdit && !isAddingCard ? (
        <Button variant="ghost" size="sm" onPress={onOpenAddCard}>
          <Plus size={16} aria-hidden />
          <span>{t('board.column.addCard')}</span>
        </Button>
      ) : null}
    </section>
  );
}

// Prototype column classes (design/Task List.dc.html:1090).
function columnState(move: ColumnMove | undefined): string {
  if (move?.isLifted)
    return 'shadow-lg outline-2 -outline-offset-2 outline-border-focus -translate-y-0.75';
  if (move?.isSource) return 'opacity-50';
  return '';
}
