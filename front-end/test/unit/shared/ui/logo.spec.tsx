import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Logo } from '@/shared/ui/logo';

describe('Logo', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the "My Trello Version" wordmark', () => {
    render(<Logo />);

    expect(screen.getByText('My Trello Version')).toBeTruthy();
  });

  it('hides the icon from assistive technology', () => {
    const { container } = render(<Logo />);

    const icon = container.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
