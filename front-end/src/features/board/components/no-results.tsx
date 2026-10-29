import { SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';

type NoResultsProps = {
  onClear: () => void;
};

// Port of the prototype no-results block (design/Task List.dc.html:374-380).
// The screen shows it instead of the columns when no card matches (FBF-28).
export function NoResults({ onClear }: NoResultsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-14 text-center">
      <SearchX size={28} className="text-text-tertiary" aria-hidden="true" />
      <p className="text-lg font-medium text-text-primary">
        {t('board.toolbar.noResults')}
      </p>
      <Button variant="secondary" size="sm" onPress={onClear}>
        {t('board.toolbar.clearFilters')}
      </Button>
    </div>
  );
}
