import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SegmentedTabs } from '@/shared/ui/tabs';

const options = [
  { id: 'active', label: 'Ativos' },
  { id: 'archived', label: 'Arquivados' },
];

describe('SegmentedTabs', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a tablist named by its label with one tab per option in order', () => {
    render(
      <SegmentedTabs
        label="Filtro de quadros"
        options={options}
        selected="active"
        onChange={vi.fn<(id: string) => void>()}
      />,
    );

    const tablist = screen.getByRole('tablist', { name: 'Filtro de quadros' });
    const names = Array.from(tablist.querySelectorAll('[role="tab"]')).map(
      (tab) => tab.textContent,
    );
    expect(names).toEqual(['Ativos', 'Arquivados']);
  });

  it('marks only the selected option as selected', () => {
    render(
      <SegmentedTabs
        label="Filtro de quadros"
        options={options}
        selected="archived"
        onChange={vi.fn<(id: string) => void>()}
      />,
    );

    expect(
      screen
        .getByRole('tab', { name: 'Arquivados' })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      screen.getByRole('tab', { name: 'Ativos' }).getAttribute('aria-selected'),
    ).toBe('false');
  });

  it('calls onChange with the clicked option id', () => {
    const onChange = vi.fn<(id: string) => void>();
    render(
      <SegmentedTabs
        label="Filtro de quadros"
        options={options}
        selected="active"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Arquivados' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith('archived');
  });

  it('calls onChange with the next option id on arrow key', () => {
    const onChange = vi.fn<(id: string) => void>();
    render(
      <SegmentedTabs
        label="Filtro de quadros"
        options={options}
        selected="active"
        onChange={onChange}
      />,
    );

    const active = screen.getByRole('tab', { name: 'Ativos' });
    act(() => {
      active.focus();
    });
    fireEvent.keyDown(active, { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalledExactlyOnceWith('archived');
  });

  it('keeps the selection controlled by the selected prop', () => {
    render(
      <SegmentedTabs
        label="Filtro de quadros"
        options={options}
        selected="active"
        onChange={vi.fn<(id: string) => void>()}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Arquivados' }));

    expect(
      screen.getByRole('tab', { name: 'Ativos' }).getAttribute('aria-selected'),
    ).toBe('true');
  });
});
