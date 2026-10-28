import type { TFunction } from 'i18next';
import { Calendar, Loader, SquareCheck, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatDayMonth, formatShortDate } from '@/shared/i18n/format-date';
import { Checkbox } from '@/shared/ui/checkbox';

import { dueLabel, isOverdue } from '../model/due-date';
import type { Card, DateParts, Label } from '../model/types';

// Full class names, so Tailwind finds them in the source (it cannot see `bg-label-${color}`).
const LABEL_CLASSES: Record<Label['color'], { chip: string; dot: string }> = {
  green: { chip: 'bg-label-green/18', dot: 'bg-label-green' },
  yellow: { chip: 'bg-label-yellow/18', dot: 'bg-label-yellow' },
  orange: { chip: 'bg-label-orange/18', dot: 'bg-label-orange' },
  red: { chip: 'bg-label-red/18', dot: 'bg-label-red' },
  purple: { chip: 'bg-label-purple/18', dot: 'bg-label-purple' },
  blue: { chip: 'bg-label-blue/18', dot: 'bg-label-blue' },
  sky: { chip: 'bg-label-sky/18', dot: 'bg-label-sky' },
  lime: { chip: 'bg-label-lime/18', dot: 'bg-label-lime' },
  pink: { chip: 'bg-label-pink/18', dot: 'bg-label-pink' },
  black: { chip: 'bg-label-black/18', dot: 'bg-label-black' },
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

  return (
    <div
      className={`flex flex-none flex-col gap-2 rounded-md border border-border-subtle bg-surface-card py-2.5 pr-2.5 pl-3 ${isArchived ? 'opacity-75' : ''}`}
    >
      {cardLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {cardLabels.map((label) => (
            <span
              key={label.id}
              className={`inline-flex h-5.5 items-center gap-1.5 rounded-xs px-2 text-xs leading-none font-medium whitespace-nowrap text-text-primary ${LABEL_CLASSES[label.color].chip}`}
            >
              <span
                className={`size-2 flex-none rounded-xs ${LABEL_CLASSES[label.color].dot}`}
              />
              <span>{label.name}</span>
            </span>
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
