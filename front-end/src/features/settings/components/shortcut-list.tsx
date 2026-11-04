import { useTranslation } from 'react-i18next';

import { SHORTCUTS } from '../model/shortcuts';

// Port of the prototype shortcut rows (design/Task List.dc.html:576).
export function ShortcutList() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      {SHORTCUTS.map(({ id, keyLabel }) => (
        <div
          key={id}
          className="flex items-center gap-3 text-md text-text-secondary"
        >
          <kbd className="inline-flex h-6.5 min-w-14 items-center justify-center rounded-sm border border-b-2 border-border-default bg-surface-sunken px-2 font-mono text-xs font-medium text-text-primary">
            {typeof keyLabel === 'string' ? keyLabel : t(keyLabel.i18nKey)}
          </kbd>
          <span>{t(`settings.shortcuts.rows.${id}`)}</span>
        </div>
      ))}
    </div>
  );
}
