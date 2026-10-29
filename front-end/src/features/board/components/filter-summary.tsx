import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';

type FilterSummaryProps = {
  matchCount: number;
  onClear: () => void;
};

// Port of the prototype result count and clear button (design/Task List.dc.html:347-350).
export function FilterSummary({ matchCount, onClear }: FilterSummaryProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* <output> carries the implicit role="status". */}
      <output className="whitespace-nowrap text-sm font-medium text-text-secondary">
        {matchCount === 1
          ? t('board.toolbar.oneCard')
          : t('board.toolbar.cards', { count: matchCount })}
      </output>
      <Button variant="ghost" size="sm" onPress={onClear}>
        <X size={14} aria-hidden />
        {t('board.toolbar.clearFilters')}
      </Button>
    </>
  );
}
