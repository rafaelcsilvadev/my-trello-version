import { CircleAlert, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@/shared/ui/alert';

import type { CardDetailMode } from '../model/card-detail';

type CardDetailNoticesProps = {
  mode: CardDetailMode;
  isColumnArchived: boolean;
};

// Port of the prototype card detail notices (design/Task List.dc.html:627-632).
export function CardDetailNotices({
  mode,
  isColumnArchived,
}: CardDetailNoticesProps) {
  const { t } = useTranslation();

  if (mode === 'editable') {
    return null;
  }

  return (
    <>
      {/* <output> carries the implicit role="status". */}
      <output className="flex items-center gap-2 rounded-sm bg-surface-sunken px-3 py-2.5 text-sm font-medium text-text-secondary">
        <Lock size={14} aria-hidden />
        <span>
          {mode === 'archivedCard'
            ? t('board.cardDetail.archivedNotice')
            : t('board.cardDetail.boardArchivedNotice')}
        </span>
      </output>
      {mode === 'archivedCard' && isColumnArchived ? (
        <Alert tone="danger" icon={CircleAlert}>
          {t('board.errors.columnArchived')}
        </Alert>
      ) : null}
    </>
  );
}
