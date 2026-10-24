import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthCard } from '@/features/auth/components/auth-card';

describe('AuthCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the title as the level-1 heading', () => {
    render(
      <AuthCard
        title="Welcome back"
        subtitle="Log in to continue"
        footer={null}
      >
        <p>form</p>
      </AuthCard>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeTruthy();
  });

  it('renders the subtitle, children and footer', () => {
    render(
      <AuthCard
        title="Welcome back"
        subtitle="Log in to continue"
        footer={<a href="/signup">Sign up</a>}
      >
        <p>form body</p>
      </AuthCard>,
    );

    expect(screen.getByText('Log in to continue')).toBeTruthy();
    expect(screen.getByText('form body')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeTruthy();
  });

  it('shows the logo', () => {
    render(
      <AuthCard
        title="Welcome back"
        subtitle="Log in to continue"
        footer={null}
      >
        <p>form</p>
      </AuthCard>,
    );

    expect(screen.getByText('task list')).toBeTruthy();
  });
});
