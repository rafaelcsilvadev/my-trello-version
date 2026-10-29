import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Shown below the toolbar while a search or filter is on (FBF-30).
// Same line layout as KeyboardHelp, but visible at every width.
export function DragOffNotice() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
      <Info size={14} aria-hidden="true" />
      <span>{t('board.toolbar.dragOff')}</span>
    </div>
  );
}
