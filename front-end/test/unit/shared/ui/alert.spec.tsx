import { cleanup, render, screen } from '@testing-library/react';
import { CircleAlert, Clock } from 'lucide-react';
import { afterEach, describe, expect, it } from 'vitest';

import { Alert } from '@/shared/ui/alert';

describe('Alert', () => {
  afterEach(() => {
    cleanup();
  });

  it('announces a danger alert with role alert and red tokens', () => {
    render(
      <Alert tone="danger" icon={CircleAlert}>
        E-mail ou senha inválidos
      </Alert>,
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('E-mail ou senha inválidos');
    expect(alert.classList.contains('bg-red-50')).toBe(true);
    expect(alert.classList.contains('text-red-700')).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('announces an info alert with role status and blue tokens', () => {
    render(
      <Alert tone="info" icon={Clock}>
        Sua sessão expirou. Entre novamente.
      </Alert>,
    );

    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Sua sessão expirou. Entre novamente.');
    expect(status.classList.contains('bg-blue-50')).toBe(true);
    expect(status.classList.contains('text-blue-700')).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('hides the icon from assistive technology', () => {
    render(
      <Alert tone="danger" icon={CircleAlert}>
        Erro
      </Alert>,
    );

    const icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
