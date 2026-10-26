import { Archive, LayoutDashboard, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';

type ActiveBoardsEmptyProps = {
  onCreate: () => void;
};

// Port of the prototype boards empty state (design/Task List.dc.html:226-232).
export function ActiveBoardsEmpty({ onCreate }: ActiveBoardsEmptyProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-18 text-center">
      <div className="flex size-13 items-center justify-center rounded-lg bg-brand-soft text-purple-700">
        <LayoutDashboard size={24} aria-hidden />
      </div>
      <h2 className="mt-2 font-display text-2xl leading-snug font-semibold tracking-tight text-text-primary">
        {t('boards.empty.activeTitle')}
      </h2>
      <p className="max-w-90 text-md text-pretty text-text-secondary">
        {t('boards.empty.activeDetail')}
      </p>
      <div className="mt-2">
        <Button onPress={onCreate}>
          <Plus size={16} aria-hidden />
          {t('boards.create')}
        </Button>
      </div>
    </div>
  );
}

// Port of the prototype archived empty state (design/Task List.dc.html:233-238).
export function ArchivedBoardsEmpty() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed border-border-default px-4 py-16 text-center">
      <Archive size={28} className="text-text-tertiary" aria-hidden />
      <p className="text-lg font-medium text-text-primary">
        {t('boards.empty.archived')}
      </p>
    </div>
  );
}
