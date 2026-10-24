import { QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LogInForm } from '@/features/auth/components/log-in-form';
import type { AuthResponse } from '@/features/auth/model/types';
import { ApiProvider } from '@/shared/api/api-context';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';
import { SessionProvider } from '@/shared/session/session-context';
import { createSessionStore } from '@/shared/session/session-store';
import { createSafeStorage } from '@/shared/storage/safe-storage';

import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const loginUrl = `${baseUrl}/api/v1/auth/login`;

const authResponse: AuthResponse = {
  accessToken: 'new-token',
  user: {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    name: 'Ana',
    email: 'ana@example.com',
    createdAt: '2026-10-23T12:00:00.000Z',
  },
};

function problem(status: number) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

// Records every request body; the response comes from `respond` per call.
function respondWith(respond: (call: number) => Response | Promise<Response>) {
  const bodies: unknown[] = [];
  server.use(
    http.post(loginUrl, async ({ request }) => {
      bodies.push(await request.json());
      return respond(bodies.length);
    }),
  );
  return bodies;
}

// A response that waits until the test releases it, to observe the pending state.
function deferred() {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { gate, release: () => release() };
}

function renderForm({
  sessionExpired = false,
  language = 'pt-BR',
}: { sessionExpired?: boolean; language?: Language } = {}) {
  const session = createSessionStore(createSafeStorage());
  const api = createApiClient({
    baseUrl,
    getToken: session.getToken,
    onSessionExpired: () => {},
  });
  const onSuccess = vi.fn<() => void>();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ApiProvider client={api}>
        <SessionProvider store={session}>
          <I18nextProvider i18n={createI18n(language)}>
            <LogInForm onSuccess={onSuccess} sessionExpired={sessionExpired} />
          </I18nextProvider>
        </SessionProvider>
      </ApiProvider>
    </QueryClientProvider>,
  );
  return { onSuccess, session };
}

const emailInput = () => screen.getByLabelText<HTMLInputElement>('E-mail');
const passwordInput = () => screen.getByLabelText<HTMLInputElement>('Senha');
const submitButton = () => screen.getByRole('button');
const form = () => submitButton().closest('form') as HTMLFormElement;

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(emailInput(), { target: { value: email } });
  fireEvent.change(passwordInput(), { target: { value: password } });
  fireEvent.submit(form());
}

describe('LogInForm', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows E-mail and Senha fields with log-in autocomplete and an Entrar button', () => {
    renderForm();

    expect(emailInput().type).toBe('email');
    expect(emailInput().autocomplete).toBe('email');
    expect(passwordInput().type).toBe('password');
    expect(passwordInput().autocomplete).toBe('current-password');
    expect(submitButton().textContent).toBe('Entrar');
    expect(form().noValidate).toBe(true);
  });

  it('sends the trimmed e-mail and the password as typed', async () => {
    const bodies = respondWith(() => HttpResponse.json(authResponse));
    const { onSuccess } = renderForm();

    fillAndSubmit('  ana@example.com ', ' secret 123 ');

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(bodies).toEqual([
      { email: 'ana@example.com', password: ' secret 123 ' },
    ]);
  });

  it('sends the request even when both fields are empty', async () => {
    const bodies = respondWith(() => problem(400));
    renderForm();

    fireEvent.submit(form());

    await waitFor(() => expect(bodies).toEqual([{ email: '', password: '' }]));
  });

  it('shows Entrando… on a disabled button while the request is in flight', async () => {
    const { gate, release } = deferred();
    respondWith(async () => {
      await gate;
      return HttpResponse.json(authResponse);
    });
    const { onSuccess } = renderForm();

    fillAndSubmit('ana@example.com', 'secret-123');

    await waitFor(() => expect(submitButton().textContent).toBe('Entrando…'));
    expect(submitButton().hasAttribute('disabled')).toBe(true);
    release();
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('sends no second request when submitted again while in flight (FAUTH-24)', async () => {
    const { gate, release } = deferred();
    const bodies = respondWith(async () => {
      await gate;
      return HttpResponse.json(authResponse);
    });
    const { onSuccess } = renderForm();

    fillAndSubmit('ana@example.com', 'secret-123');
    await waitFor(() => expect(bodies).toHaveLength(1));
    fireEvent.submit(form());
    release();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(bodies).toHaveLength(1);
  });

  it('calls onSuccess once and stores the token on 200', async () => {
    respondWith(() => HttpResponse.json(authResponse));
    const { onSuccess, session } = renderForm();

    fillAndSubmit('ana@example.com', 'secret-123');

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(session.getToken()).toBe('new-token');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each([401, 400])(
    'shows the invalid-credentials alert and keeps the values on %i',
    async (status) => {
      respondWith(() => problem(status));
      const { onSuccess, session } = renderForm();

      fillAndSubmit('ana@example.com', 'wrong-pass');

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe('E-mail ou senha inválidos');
      expect(emailInput().value).toBe('ana@example.com');
      expect(passwordInput().value).toBe('wrong-pass');
      expect(onSuccess).not.toHaveBeenCalled();
      expect(session.getToken()).toBeNull();
    },
  );

  it('shows the rate-limit alert and keeps the button enabled on 429', async () => {
    respondWith(() => problem(429));
    const { onSuccess } = renderForm();

    fillAndSubmit('ana@example.com', 'secret-123');

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(
      'Muitas tentativas. Aguarde um minuto e tente novamente.',
    );
    expect(submitButton().hasAttribute('disabled')).toBe(false);
    expect(submitButton().textContent).toBe('Entrar');
    expect(emailInput().value).toBe('ana@example.com');
    expect(passwordInput().value).toBe('secret-123');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it.each([
    ['a network error', () => HttpResponse.error()],
    ['500', () => problem(500)],
  ])(
    'shows the connection alert and re-enables the button on %s',
    async (_case, response) => {
      respondWith(response);
      const { onSuccess } = renderForm();

      fillAndSubmit('ana@example.com', 'secret-123');

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe(
        'Não foi possível falar com o servidor. Verifique sua conexão.',
      );
      expect(submitButton().hasAttribute('disabled')).toBe(false);
      expect(emailInput().value).toBe('ana@example.com');
      expect(passwordInput().value).toBe('secret-123');
      expect(onSuccess).not.toHaveBeenCalled();
    },
  );

  it('hides the previous alert when the form is submitted again (FAUTH-19)', async () => {
    const { gate, release } = deferred();
    respondWith(async (call) => {
      if (call === 1) {
        return problem(429);
      }
      await gate;
      return HttpResponse.json(authResponse);
    });
    const { onSuccess } = renderForm();

    fillAndSubmit('ana@example.com', 'secret-123');
    await screen.findByRole('alert');
    fireEvent.submit(form());

    await waitFor(() => expect(submitButton().textContent).toBe('Entrando…'));
    expect(screen.queryByRole('alert')).toBeNull();
    release();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the session-expired status box when sessionExpired is set', () => {
    renderForm({ sessionExpired: true });

    expect(screen.getByRole('status').textContent).toBe(
      'Sua sessão expirou. Entre novamente.',
    );
  });

  it('shows no session-expired status box by default', () => {
    renderForm();

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders the English texts', async () => {
    respondWith(() => problem(401));
    renderForm({ language: 'en', sessionExpired: true });

    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(submitButton().textContent).toBe('Sign in');
    expect(screen.getByRole('status').textContent).toBe(
      'Your session expired. Log in again.',
    );

    fireEvent.submit(form());

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Invalid email or password',
    );
  });
});
