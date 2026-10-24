import { useTranslation } from 'react-i18next';

import { SessionSection } from '@/features/auth';

// Port of the prototype settings screen (design/Task List.dc.html:563-584).
export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex w-full max-w-180 flex-col gap-3.5 px-4 py-6">
      <h1 className="mb-1 font-display text-3xl leading-tight font-semibold tracking-tight text-text-primary">
        {t('routes.settings')}
      </h1>
      <SessionSection />
    </main>
  );
}
