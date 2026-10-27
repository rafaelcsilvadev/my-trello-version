import { Lock, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';

type ArchivedBoardBannerProps = {
  isPending: boolean;
  onRestore: () => void;
};

// Port of the prototype archived board banner (design/Task List.dc.html:317-322).
export function ArchivedBoardBanner({
  isPending,
  onRestore,
}: ArchivedBoardBannerProps) {
  const { t } = useTranslation();

  return (
    // <output> carries the implicit role="status".
    <output className="flex flex-wrap items-center gap-2 rounded-sm bg-surface-sunken py-2 pr-2 pl-3 text-sm font-medium text-text-secondary">
      <Lock size={14} aria-hidden />
      <span className="flex-1">{t('board.archivedBanner.text')}</span>
      <Button
        variant="secondary"
        size="sm"
        isDisabled={isPending}
        onPress={onRestore}
      >
        <RotateCcw size={14} aria-hidden />
        <span>{t('board.archivedBanner.restore')}</span>
      </Button>
    </output>
  );
}
