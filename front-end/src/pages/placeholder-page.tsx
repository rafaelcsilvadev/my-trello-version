import { useTranslation } from 'react-i18next';

import type { en } from '@/shared/i18n/locales/en';

export type RouteTitleKey = keyof typeof en.routes;

// Stands in for a route until its feature ships the real screen.
export function PlaceholderPage({ titleKey }: { titleKey: RouteTitleKey }) {
  const { t } = useTranslation();
  return <h1>{t(`routes.${titleKey}`)}</h1>;
}
