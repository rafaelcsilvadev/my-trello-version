import type { Board } from '@my-trello/api-contract';
import {
  Archive,
  Calendar,
  Loader,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { formatShortDate } from '@/shared/i18n/format-date';
import { ActionMenu } from '@/shared/ui/menu';

import type { BoardsTab } from '../model/types';

type BoardCardProps = {
  board: Board;
  tab: BoardsTab;
  isPending: boolean;
  onEdit: (board: Board) => void;
  onArchive: (board: Board) => void;
  onRestore: (board: Board) => void;
  onDelete: (board: Board) => void;
};

// Port of the prototype board card (design/Task List.dc.html:240-260). The link covers
// the card; the menu sits beside it, never inside, so its button is not nested in a link.
export function BoardCard({
  board,
  tab,
  isPending,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: BoardCardProps) {
  const { t } = useTranslation();
  const isArchived = tab === 'archived';
  const DateIcon = isArchived ? Archive : Calendar;
  const dateText = isArchived
    ? t('boards.card.archivedOn', {
        date: formatShortDate(board.archivedAt ?? board.updatedAt, t),
      })
    : t('boards.card.createdOn', {
        date: formatShortDate(board.createdAt, t),
      });
  const items = isArchived
    ? [
        {
          id: 'restore',
          label: t('boards.actions.restore'),
          icon: RotateCcw,
          onAction: () => onRestore(board),
        },
        {
          id: 'delete',
          label: t('boards.actions.deleteForever'),
          icon: Trash2,
          tone: 'danger' as const,
          onAction: () => onDelete(board),
        },
      ]
    : [
        {
          id: 'edit',
          label: t('boards.actions.edit'),
          icon: Pencil,
          onAction: () => onEdit(board),
        },
        {
          id: 'archive',
          label: t('boards.actions.archive'),
          icon: Archive,
          onAction: () => onArchive(board),
        },
      ];

  return (
    <div
      className={`relative rounded-lg border border-border-subtle bg-surface-card shadow-xs transition hover:border-border-default hover:shadow-md has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-border-focus ${isPending ? 'opacity-60' : ''}`}
    >
      <Link
        to={`/b/${board.id}`}
        className="flex min-h-26 flex-col justify-between gap-3 rounded-lg pt-3.5 pr-14 pb-3.5 pl-4 outline-none"
      >
        <div className="flex min-w-0 flex-col gap-1 pt-1">
          <span className="font-display text-xl leading-snug font-semibold tracking-snug text-pretty wrap-anywhere text-text-primary">
            {board.title}
          </span>
          {board.description ? (
            <span className="line-clamp-2 text-sm wrap-anywhere text-text-secondary">
              {board.description}
            </span>
          ) : null}
        </div>
        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
          <DateIcon size={14} className="text-text-tertiary" aria-hidden />
          <span>{dateText}</span>
          {isPending ? (
            <span title={t('boards.card.pending')}>
              <Loader
                size={14}
                className="motion-safe:animate-spin"
                aria-hidden
              />
              <span className="sr-only">{t('boards.card.pending')}</span>
            </span>
          ) : null}
        </span>
      </Link>
      <div className="absolute top-3 right-3">
        <ActionMenu
          label={t('boards.card.menu')}
          items={items}
          isDisabled={isPending}
        />
      </div>
    </div>
  );
}
