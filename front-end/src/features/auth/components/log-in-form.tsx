import { CircleAlert, Clock, Timer } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import { useLogIn } from '../api/mutations';
import { formAlertFor } from '../model/errors';
import type { FormAlert } from '../model/types';

const ALERT_KEYS = {
  invalidCredentials: 'auth.errors.invalidCredentials',
  rateLimited: 'auth.errors.rateLimited',
  network: 'errors.network',
} as const satisfies Record<FormAlert, string>;

type LogInFormProps = {
  onSuccess: () => void;
  sessionExpired: boolean;
};

// Port of the prototype log-in form (design/Task List.dc.html:135-153).
export function LogInForm({ onSuccess, sessionExpired }: LogInFormProps) {
  const { t } = useTranslation();
  const logIn = useLogIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alert, setAlert] = useState<FormAlert | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (logIn.isPending) {
      return;
    }
    setAlert(null);
    logIn.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => onSuccess(),
        onError: (err) => setAlert(formAlertFor(err, 'logIn')),
      },
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {sessionExpired && (
        <Alert tone="info" icon={Clock}>
          {t('session.expired')}
        </Alert>
      )}
      {alert && (
        <Alert
          tone="danger"
          icon={alert === 'rateLimited' ? Timer : CircleAlert}
        >
          {t(ALERT_KEYS[alert])}
        </Alert>
      )}
      <TextField
        label={t('auth.fields.email')}
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />
      <TextField
        label={t('auth.fields.password')}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      <div className="mt-1.5">
        <Button type="submit" size="lg" fullWidth isDisabled={logIn.isPending}>
          {logIn.isPending
            ? t('auth.logIn.submitting')
            : t('auth.logIn.submit')}
        </Button>
      </div>
    </form>
  );
}
