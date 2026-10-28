import { CircleAlert, Timer } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import { useSignUp } from '../api/mutations';
import { formAlertFor, mapSignUpServerErrors } from '../model/errors';
import type { FormAlert, SignUpField, SignUpFieldErrors } from '../model/types';
import { firstInvalidField, validateSignUp } from '../model/validation';

const ALERT_KEYS = {
  invalidCredentials: 'auth.errors.invalidCredentials',
  rateLimited: 'auth.errors.rateLimited',
  network: 'errors.network',
} as const satisfies Record<FormAlert, string>;

type SignUpFormProps = {
  onSuccess: () => void;
};

// Port of the prototype sign-up form (design/Task List.dc.html:135-153).
export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const { t } = useTranslation();
  const signUp = useSignUp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignUpFieldErrors>({});
  const [alert, setAlert] = useState<FormAlert | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  // Returns whether any field is invalid; the first one takes the focus.
  function showFieldErrors(errors: SignUpFieldErrors): boolean {
    setFieldErrors(errors);
    const invalid = firstInvalidField(errors);
    if (!invalid) {
      return false;
    }
    const refs = {
      name: nameRef,
      email: emailRef,
      password: passwordRef,
      confirmPassword: confirmPasswordRef,
    };
    refs[invalid].current?.focus();
    return true;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signUp.isPending) {
      return;
    }
    setAlert(null);
    const values = { name, email, password, confirmPassword };
    if (showFieldErrors(validateSignUp(values))) {
      return;
    }
    signUp.mutate(
      { name: name.trim(), email: email.trim(), password },
      {
        onSuccess: () => onSuccess(),
        onError: (err) => {
          const serverErrors = mapSignUpServerErrors(err, values);
          if (serverErrors) {
            showFieldErrors(serverErrors);
          } else {
            setAlert(formAlertFor(err, 'signUp'));
          }
        },
      },
    );
  }

  function errorFor(field: SignUpField) {
    const error = fieldErrors[field];
    return error && t(`auth.errors.${error}`);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {alert && (
        <Alert
          tone="danger"
          icon={alert === 'rateLimited' ? Timer : CircleAlert}
        >
          {t(ALERT_KEYS[alert])}
        </Alert>
      )}
      <TextField
        label={t('auth.fields.name')}
        autoComplete="name"
        value={name}
        onChange={setName}
        error={errorFor('name')}
        inputRef={nameRef}
      />
      <TextField
        label={t('auth.fields.email')}
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        error={errorFor('email')}
        inputRef={emailRef}
      />
      <TextField
        label={t('auth.fields.password')}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        hint={t('auth.fields.passwordHint')}
        error={errorFor('password')}
        inputRef={passwordRef}
      />
      <TextField
        label={t('auth.fields.confirmPassword')}
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={errorFor('confirmPassword')}
        inputRef={confirmPasswordRef}
      />
      <div className="mt-1.5">
        <Button type="submit" size="lg" fullWidth isDisabled={signUp.isPending}>
          {signUp.isPending
            ? t('auth.signUp.submitting')
            : t('auth.signUp.submit')}
        </Button>
      </div>
    </form>
  );
}
