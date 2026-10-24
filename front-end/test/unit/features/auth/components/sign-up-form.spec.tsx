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

import { SignUpForm } from '@/features/auth/components/sign-up-form';
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
const registerUrl = `${baseUrl}/api/v1/auth/register`;

const authResponse: AuthResponse = {
  accessToken: 'new-token',
  user: {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    name: 'Ana',
    email: 'ana@example.com',
    createdAt: '2026-10-24T12:00:00.000Z',
  },
};

function problem(
  status: number,
  extra: { type?: string; errors?: { field: string; message: string }[] } = {},
) {
  return HttpResponse.json(
    {
      type: extra.type ?? `/problems/${status}`,
      title: 'Error',
      status,
      detail: '',
      ...(extra.errors && { errors: extra.errors }),
    },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

// Records every request body; the response comes from `respond` per call.
function respondWith(respond: (call: number) => Response | Promise<Response>) {
  const bodies: unknown[] = [];
  server.use(
    http.post(registerUrl, async ({ request }) => {
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

function renderForm({ language = 'pt-BR' }: { language?: Language } = {}) {
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
            <SignUpForm onSuccess={onSuccess} />
          </I18nextProvider>
        </SessionProvider>
      </ApiProvider>
    </QueryClientProvider>,
  );
  return { onSuccess, session };
}

const nameInput = () => screen.getByLabelText<HTMLInputElement>('Nome');
const emailInput = () => screen.getByLabelText<HTMLInputElement>('E-mail');
const passwordInput = () => screen.getByLabelText<HTMLInputElement>('Senha');
const submitButton = () => screen.getByRole('button');
const form = () => submitButton().closest('form') as HTMLFormElement;

// The field's error is its accessible description minus the hint.
function fieldError(input: HTMLInputElement) {
  const ids = input.getAttribute('aria-describedby')?.split(' ') ?? [];
  return ids
    .map((id) => document.getElementById(id))
    .find((el) => el && el.getAttribute('slot') !== 'description')?.textContent;
}

const valid = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'secret-123',
};

function fillAndSubmit(values: Partial<typeof valid> = {}) {
  const { name, email, password } = { ...valid, ...values };
  fireEvent.change(nameInput(), { target: { value: name } });
  fireEvent.change(emailInput(), { target: { value: email } });
  fireEvent.change(passwordInput(), { target: { value: password } });
  fireEvent.submit(form());
}

describe('SignUpForm', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows Nome, E-mail and Senha with sign-up autocomplete, the password hint and a Criar conta button (FAUTH-01, FAUTH-27)', () => {
    renderForm();

    expect(nameInput().type).toBe('text');
    expect(nameInput().autocomplete).toBe('name');
    expect(emailInput().type).toBe('email');
    expect(emailInput().autocomplete).toBe('email');
    expect(passwordInput().type).toBe('password');
    expect(passwordInput().autocomplete).toBe('new-password');
    expect(passwordInput().getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByText('Use de 8 a 72 caracteres')).toBeTruthy();
    expect(submitButton().textContent).toBe('Criar conta');
    expect(form().noValidate).toBe(true);
  });

  it.each([
    ['an empty name', { name: '   ' }, nameInput, 'Informe seu nome'],
    [
      'a name over 100 characters',
      { name: 'a'.repeat(101) },
      nameInput,
      'Use até 100 caracteres',
    ],
    [
      'an invalid e-mail',
      { email: 'ana@x' },
      emailInput,
      'Informe um e-mail válido',
    ],
    [
      'a 7-character password',
      { password: '1234567' },
      passwordInput,
      'Use de 8 a 72 caracteres',
    ],
    [
      'a 73-character password',
      { password: 'a'.repeat(73) },
      passwordInput,
      'Use de 8 a 72 caracteres',
    ],
  ])(
    'shows the field message and sends no request for %s (FAUTH-02–FAUTH-05)',
    async (_case, values, input, message) => {
      const bodies = respondWith(() => HttpResponse.json(authResponse));
      const { onSuccess } = renderForm();

      fillAndSubmit(values);

      await waitFor(() => expect(fieldError(input())).toBe(message));
      expect(input().getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(input());
      expect(bodies).toHaveLength(0);
      expect(onSuccess).not.toHaveBeenCalled();
    },
  );

  it('shows every field message and focuses the first invalid field (FAUTH-25)', async () => {
    const bodies = respondWith(() => HttpResponse.json(authResponse));
    renderForm();

    fillAndSubmit({ name: 'Ana', email: 'ana', password: 'short' });

    await waitFor(() =>
      expect(fieldError(emailInput())).toBe('Informe um e-mail válido'),
    );
    expect(fieldError(passwordInput())).toBe('Use de 8 a 72 caracteres');
    expect(nameInput().hasAttribute('aria-invalid')).toBe(false);
    expect(document.activeElement).toBe(emailInput());
    expect(bodies).toHaveLength(0);
  });

  it('sends the trimmed name and e-mail and the password as typed (FAUTH-06)', async () => {
    const bodies = respondWith(() =>
      HttpResponse.json(authResponse, { status: 201 }),
    );
    const { onSuccess } = renderForm();

    fillAndSubmit({
      name: '  Ana  ',
      email: ' ana@example.com ',
      password: ' secret 123 ',
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(bodies).toEqual([
      { name: 'Ana', email: 'ana@example.com', password: ' secret 123 ' },
    ]);
  });

  it('shows Criando… on a disabled button while the request is in flight (FAUTH-07)', async () => {
    const { gate, release } = deferred();
    respondWith(async () => {
      await gate;
      return HttpResponse.json(authResponse, { status: 201 });
    });
    const { onSuccess } = renderForm();

    fillAndSubmit();

    await waitFor(() => expect(submitButton().textContent).toBe('Criando…'));
    expect(submitButton().hasAttribute('disabled')).toBe(true);
    release();
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('sends no second request when submitted again while in flight (FAUTH-24)', async () => {
    const { gate, release } = deferred();
    const bodies = respondWith(async () => {
      await gate;
      return HttpResponse.json(authResponse, { status: 201 });
    });
    const { onSuccess } = renderForm();

    fillAndSubmit();
    await waitFor(() => expect(bodies).toHaveLength(1));
    fireEvent.submit(form());
    release();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(bodies).toHaveLength(1);
  });

  it('calls onSuccess once and stores the token on 201', async () => {
    respondWith(() => HttpResponse.json(authResponse, { status: 201 }));
    const { onSuccess, session } = renderForm();

    fillAndSubmit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(session.getToken()).toBe('new-token');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the e-mail-taken message on E-mail and stores no token on 409 (FAUTH-09)', async () => {
    respondWith(() =>
      problem(409, { type: '/problems/email-already-registered' }),
    );
    const { onSuccess, session } = renderForm();

    fillAndSubmit();

    await waitFor(() =>
      expect(fieldError(emailInput())).toBe('Este e-mail já está cadastrado'),
    );
    expect(emailInput().getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(emailInput().value).toBe('ana@example.com');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(session.getToken()).toBeNull();
  });

  it('shows each field message from a 400 errors[] response (FAUTH-10)', async () => {
    respondWith(() =>
      problem(400, {
        errors: [
          { field: 'name', message: 'too long' },
          { field: 'email', message: 'invalid' },
          { field: 'password', message: 'length' },
        ],
      }),
    );
    const { onSuccess } = renderForm();

    fillAndSubmit();

    await waitFor(() =>
      expect(fieldError(nameInput())).toBe('Use até 100 caracteres'),
    );
    expect(fieldError(emailInput())).toBe('Informe um e-mail válido');
    expect(fieldError(passwordInput())).toBe('Use de 8 a 72 caracteres');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows the rate-limit alert and keeps the button enabled on 429 (FAUTH-17)', async () => {
    respondWith(() => problem(429));
    const { onSuccess } = renderForm();

    fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(
      'Muitas tentativas. Aguarde um minuto e tente novamente.',
    );
    expect(submitButton().hasAttribute('disabled')).toBe(false);
    expect(submitButton().textContent).toBe('Criar conta');
    expect(nameInput().value).toBe('Ana');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it.each([
    ['a network error', () => HttpResponse.error()],
    ['500', () => problem(500)],
    ['409 of another type', () => problem(409)],
    ['400 without errors[]', () => problem(400)],
  ])(
    'shows the connection alert and re-enables the button on %s (FAUTH-18)',
    async (_case, response) => {
      respondWith(response);
      const { onSuccess } = renderForm();

      fillAndSubmit();

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe(
        'Não foi possível falar com o servidor. Verifique sua conexão.',
      );
      expect(submitButton().hasAttribute('disabled')).toBe(false);
      expect(emailInput().hasAttribute('aria-invalid')).toBe(false);
      expect(onSuccess).not.toHaveBeenCalled();
    },
  );

  it('clears the previous field errors and alert when submitted again (FAUTH-19)', async () => {
    const { gate, release } = deferred();
    respondWith(async (call) => {
      if (call === 1) {
        return problem(429);
      }
      await gate;
      return HttpResponse.json(authResponse, { status: 201 });
    });
    const { onSuccess } = renderForm();

    fillAndSubmit({ email: 'ana' });
    await waitFor(() =>
      expect(fieldError(emailInput())).toBe('Informe um e-mail válido'),
    );
    fillAndSubmit();
    await screen.findByRole('alert');
    expect(emailInput().hasAttribute('aria-invalid')).toBe(false);
    fireEvent.submit(form());

    await waitFor(() => expect(submitButton().textContent).toBe('Criando…'));
    expect(screen.queryByRole('alert')).toBeNull();
    release();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('renders the English texts', async () => {
    renderForm({ language: 'en' });

    expect(screen.getByLabelText('Name')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByText('Use 8 to 72 characters')).toBeTruthy();
    expect(submitButton().textContent).toBe('Create account');

    fireEvent.submit(form());

    await waitFor(() =>
      expect(fieldError(screen.getByLabelText('Name'))).toBe('Enter your name'),
    );
  });
});
