import { useTranslation } from 'react-i18next';

import {
  DESKTOP_QUERY,
  useMediaQuery,
} from '@/shared/responsive/use-media-query';

import { ShortcutList } from './shortcut-list';

// Port of the prototype shortcuts panel (design/Task List.dc.html:573-578).
// Phones have no keyboard, so the panel is desktop only.
export function ShortcutsPanel() {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  if (!isDesktop) return null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-card px-4.5 py-4">
      <h2 className="text-lg font-medium text-text-primary">
        {t('settings.shortcuts.title')}
      </h2>
      <ShortcutList />
    </section>
  );
}
