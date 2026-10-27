import { useTranslation } from 'react-i18next';

import { Switch } from '@/shared/ui/switch';

type BoardToolbarProps = {
  showArchived: boolean;
  onShowArchivedChange: (showArchived: boolean) => void;
};

// Port of the prototype board toolbar (design/Task List.dc.html:323-351).
// Search and filters join this row in 3c.
export function BoardToolbar({
  showArchived,
  onShowArchivedChange,
}: BoardToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <Switch
        label={t('board.toolbar.showArchived')}
        isSelected={showArchived}
        onChange={onShowArchivedChange}
      />
    </div>
  );
}
