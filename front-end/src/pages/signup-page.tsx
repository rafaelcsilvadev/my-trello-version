import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { AuthCard, SignUpForm } from '@/features/auth';
import { useToast } from '@/shared/ui/toast/use-toast';

export function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  function handleSuccess() {
    // A new account always starts on My boards, whatever `redirect` says (FAUTH-08).
    void navigate('/boards', { replace: true });
    toast.show({ message: t('auth.accountCreated') });
  }

  return (
    <AuthCard
      title={t('auth.signUp.title')}
      subtitle={t('auth.signUp.subtitle')}
      footer={
        <p>
          {t('auth.signUp.haveAccount')}{' '}
          <Link to="/login" className="font-medium">
            {t('auth.signUp.haveAccountLink')}
          </Link>
        </p>
      }
    >
      <SignUpForm onSuccess={handleSuccess} />
    </AuthCard>
  );
}
