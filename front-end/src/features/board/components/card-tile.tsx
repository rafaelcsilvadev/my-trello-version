import type { TFunction } from 'i18next';
import {
  ArrowRightLeft,
  Calendar,
  Loader,
  SquareCheck,
  TriangleAlert,
} from 'lucide-react';
import type { DragEvent, KeyboardEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDayMonth, formatShortDate } from '@/shared/i18n/format-date';
import { Checkbox } from '@/shared/ui/checkbox';
import { ActionMenu } from '@/shared/ui/menu';

import { dueLabel, isOverdue } from '../model/due-date';
import type { ArrowKey } from '../model/move';
import type { Card, DateParts, Label } from '../model/types';
import { LabelChip } from './label-chip';

export const ARROW_KEYS: ReadonlySet<string> = new Set<ArrowKey>([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

// Clicks that must not open the card: the checkbox renders as a label, and the
// portaled menu still bubbles through React. React Aria buttons stop their own clicks.
const NESTED_CONTROLS = 'label, [role="menu"]';

// The card's part in a move session and its "Mover para…" menu (FDND-01, FDND-09, FDND-29). Ignored on archived cards and read-only boards.
// While `canDrag` is false the card keeps its focus and menu but neither drags nor picks (FBF-32, FBF-34).
export type CardMove = {
  isSource: boolean;
  isLifted: boolean;
  canDrag: boolean;
  onDragStart: (cardId: string) => void;
  onDragEnd: () => void;
  onPick: (cardId: string) => void;
  onStep: (key: ArrowKey) => void;
  onDrop: () => void;
  onCancel: () => void;
  onMoveTo: (cardId: string) => void;
};

type CardTileProps = {
  card: Card;
  labels: ReadonlyMap<string, Label>;
  today: DateParts;
  mode: 'active' | 'archived';
  fromTitle?: string;
  isPending: boolean;
  isReadOnly: boolean;
  onToggleDone: (card: Card) => void;
  move?: CardMove;
  // Opens the card detail (FCD-01, FCD-02); also makes archived and read-only tiles focusable.
  onOpen?: (cardId: string) => void;
};

// Port of the prototype card tile (design/Task List.dc.html:412-427, 464-473).
export function CardTile({
  card,
  labels,
  today,
  mode,
  fromTitle,
  isPending,
  isReadOnly,
  onToggleDone,
  move,
  onOpen,
}: CardTileProps) {
  const { t } = useTranslation();
  const isArchived = mode === 'archived';
  const cardLabels = card.labelIds.flatMap((id) => labels.get(id) ?? []);
  const due =
    isArchived || card.dueDate === null
      ? null
      : dueText(card.dueDate, today, t);
  const overdue = !isArchived && isOverdue(card, today);
  const { total, done } = card.checklist;
  const movable = !isArchived && !isReadOnly ? move : undefined;
  const isButton = movable !== undefined || onOpen !== undefined;

  // Only keys pressed on the card itself, so the checkbox keeps Space (FDND-16).
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (!movable?.isLifted) {
      if (event.key === 'Enter' && onOpen) {
        event.preventDefault();
        onOpen(card.id);
        return;
      }
      if (!movable || event.key !== ' ' || isPending || !movable.canDrag)
        return;
      event.preventDefault();
      movable.onPick(card.id);
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

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (
      event.target instanceof Element &&
      event.target.closest(NESTED_CONTROLS)
    )
      return;
    onOpen?.(card.id);
  }

  // Firefox starts a drag only with data set.
  function onDragStart(event: DragEvent<HTMLDivElement>) {
    if (!movable?.canDrag) return;
    event.dataTransfer.setData('text/plain', card.id);
    event.dataTransfer.effectAllowed = 'move';
    movable?.onDragStart(card.id);
  }

  return (
    <div
      {...(isButton
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': card.title,
            'data-card-id': card.id,
            onKeyDown,
            onClick,
          }
        : {})}
      {...(movable
        ? {
            draggable: movable.canDrag && !isPending,
            onDragStart,
            onDragEnd: movable.onDragEnd,
          }
        : {})}
      className={`flex flex-none flex-col gap-2 rounded-md border bg-surface-card py-2.5 pr-2.5 pl-3 ${tileState(isArchived, isButton, movable)}`}
    >
      {cardLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {cardLabels.map((label) => (
            <LabelChip key={label.id} label={label} />
          ))}
        </div>
      ) : null}
      <div className="flex items-start gap-2">
        <span className="flex pt-0.5">
          <Checkbox
            label={t('board.card.done')}
            isSelected={card.done}
            onChange={() => onToggleDone(card)}
            isDisabled={isArchived || isReadOnly || isPending}
          />
        </span>
        <div
          className={`min-w-0 flex-1 pt-0.5 text-md leading-snug font-medium text-pretty wrap-anywhere ${card.done ? 'text-text-tertiary line-through' : 'text-text-primary'}`}
        >
          {card.title}
        </div>
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
        {movable ? (
          <span className="-my-0.5 -mr-1 flex">
            <ActionMenu
              label={t('board.moveTo.title')}
              isDisabled={isPending}
              items={[
                {
                  id: 'move-to',
                  label: t('board.moveTo.title'),
                  icon: ArrowRightLeft,
                  onAction: () => movable.onMoveTo(card.id),
                },
              ]}
            />
          </span>
        ) : null}
      </div>
      {due !== null || total > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-secondary">
          {due !== null ? (
            <span
              className={`inline-flex items-center gap-1 font-medium ${dueColor(card.done, overdue)}`}
            >
              <Calendar size={14} aria-hidden />
              <span>{due}</span>
            </span>
          ) : null}
          {overdue ? (
            <span className="inline-flex h-5 items-center gap-1 rounded-xs bg-red-50 px-1.5 font-medium text-red-700">
              <TriangleAlert size={12} aria-hidden />
              <span>{t('board.card.overdue')}</span>
            </span>
          ) : null}
          {total > 0 ? (
            <span
              className={`inline-flex items-center gap-1 ${done === total ? 'text-green-700' : 'text-text-secondary'}`}
            >
              <SquareCheck size={14} aria-hidden />
              <span>{`${done}/${total}`}</span>
            </span>
          ) : null}
        </div>
      ) : null}
      {isArchived ? (
        <div className="text-xs text-text-tertiary">
          {t('board.card.archived', {
            date: formatShortDate(card.archivedAt ?? card.updatedAt, t),
            column: fromTitle ?? '',
          })}
        </div>
      ) : null}
    </div>
  );
}

// Prototype card classes (design/Task List.dc.html:1073-1075).
function tileState(
  isArchived: boolean,
  isButton: boolean,
  move: CardMove | undefined,
): string {
  const focus = isButton
    ? 'cursor-pointer transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus'
    : '';
  if (isArchived) return `${focus} border-border-subtle opacity-75`;
  if (!move) return `${focus} border-border-subtle`;
  if (move.isSource)
    return `${focus} border-dashed border-purple-300 shadow-xs opacity-45`;
  if (move.isLifted)
    return `${focus} border-border-focus shadow-lg ring-3 ring-border-focus/22 -translate-y-0.5 -rotate-1`;
  return `${focus} border-border-subtle shadow-xs hover:border-border-default hover:shadow-md`;
}

function dueColor(isDone: boolean, overdue: boolean): string {
  if (isDone) return 'text-green-700';
  return overdue ? 'text-red-600' : 'text-text-secondary';
}

function dueText(due: string, today: DateParts, t: TFunction): string {
  const label = dueLabel(due, today);
  if (label.kind !== 'date') return t(`board.card.due.${label.kind}`);
  return formatDayMonth(
    { year: label.year ?? today.year, month: label.month, day: label.day },
    t,
    today.year,
  );
}
