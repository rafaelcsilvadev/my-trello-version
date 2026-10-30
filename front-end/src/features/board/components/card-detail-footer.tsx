import { Archive, ArrowRightLeft, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatShortDate } from '@/shared/i18n/format-date';
import { Button } from '@/shared/ui/button';

import type { CardDetailMode } from '../model/card-detail';

type CardDetailFooterProps = {
  createdAt: string;
  mode: CardDetailMode;
  isColumnArchived: boolean;
  isPending: boolean;
  onMove: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
};

// Port of the prototype card detail footer (design/Task List.dc.html:725-735).
export function CardDetailFooter({
  createdAt,
  mode,
  isColumnArchived,
  isPending,
  onMove,
  onArchive,
  onRestore,
  onDelete,
}: CardDetailFooterProps) {
  const { t } = useTranslation();
  const isArchivedActionDisabled = isColumnArchived || isPending;

  return (
    <div className="flex flex-none flex-wrap items-center gap-2 border-t border-border-subtle bg-neutral-25 py-3 pr-4 pl-5">
      <span className="min-w-30 flex-1 text-xs text-text-tertiary">
        {t('board.cardDetail.created', {
          d: formatShortDate(createdAt, t),
        })}
      </span>
      {mode === 'editable' ? (
        <>
          <Button variant="secondary" size="sm" onPress={onMove}>
            <ArrowRightLeft size={14} aria-hidden />
            <span>{t('board.cardDetail.moveTo')}</span>
          </Button>
          <Button variant="secondary" size="sm" onPress={onArchive}>
            <Archive size={14} aria-hidden />
            <span>{t('board.cardDetail.archive')}</span>
          </Button>
        </>
      ) : null}
      {mode === 'archivedCard' ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            isDisabled={isArchivedActionDisabled}
            onPress={onDelete}
          >
            <Trash2 size={14} aria-hidden />
            <span>{t('board.cardDetail.deleteForever')}</span>
          </Button>
          <Button
            size="sm"
            isDisabled={isArchivedActionDisabled}
            onPress={onRestore}
          >
            <RotateCcw size={14} aria-hidden />
            <span>{t('board.cardDetail.restore')}</span>
          </Button>
        </>
      ) : null}
    </div>
  );
}
