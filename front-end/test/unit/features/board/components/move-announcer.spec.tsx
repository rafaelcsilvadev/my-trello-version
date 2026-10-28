import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MoveAnnouncer } from '@/features/board/components/move-announcer';

afterEach(cleanup);

describe('MoveAnnouncer', () => {
  it('is a visually hidden assertive status region', () => {
    render(<MoveAnnouncer text="Tarefa Login solta em Fazendo" />);

    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-live')).toBe('assertive');
    expect(region.classList.contains('sr-only')).toBe(true);
  });

  it('renders the given announcement', () => {
    render(<MoveAnnouncer text="Movimento cancelado" />);

    expect(screen.getByRole('status').textContent).toBe('Movimento cancelado');
  });

  it('stays mounted with an empty text so the first message is read', () => {
    render(<MoveAnnouncer text="" />);

    expect(screen.getByRole('status').textContent).toBe('');
  });
});
