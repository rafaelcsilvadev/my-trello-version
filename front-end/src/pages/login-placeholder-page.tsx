import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { PlaceholderPage } from './placeholder-page';

export function LoginPlaceholderPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('reason') === 'session-expired';

  return (
    <>
      <PlaceholderPage titleKey="login" />
      {sessionExpired && <p>{t('session.expired')}</p>}
    </>
  );
}
