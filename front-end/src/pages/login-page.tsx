import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { AuthCard, LogInForm } from '@/features/auth';
import { safeRedirect } from '@/shared/navigation/safe-redirect';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('reason') === 'session-expired';

  function handleSuccess() {
    void navigate(safeRedirect(searchParams.get('redirect')), {
      replace: true,
    });
  }

  return (
    <AuthCard
      title={t('auth.logIn.title')}
      subtitle={t('auth.logIn.subtitle')}
      footer={
        <p>
          {t('auth.logIn.noAccount')}{' '}
          <Link to="/signup" className="font-medium">
            {t('auth.logIn.createAccountLink')}
          </Link>
        </p>
      }
    >
      <LogInForm onSuccess={handleSuccess} sessionExpired={sessionExpired} />
    </AuthCard>
  );
}
