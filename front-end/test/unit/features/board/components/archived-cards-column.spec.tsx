import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArchivedCardsColumn } from '@/features/board/components/archived-cards-column';
import type {
  ArchivedCardItem,
  DateParts,
  Label,
} from '@/features/board/model/types';
import type { ArchivedStatus } from '@/features/board/view-models/use-board-view-model';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

import { cardFixture } from '../../../../support/fixtures/board';

const today: DateParts = { year: 2026, month: 10, day: 27 };

const labels = new Map<string, Label>();

const twoItems: ArchivedCardItem[] = [
  {
    card: cardFixture('c1', 'list-1', {
      title: 'Write release notes',
      done: true,
      archivedAt: '2026-10-02T12:00:00.000Z',
    }),
    fromTitle: 'To do',
  },
  {
    card: cardFixture('c2', 'list-2', {
      title: 'Review PR',
      archivedAt: '2026-10-01T12:00:00.000Z',
    }),
    fromTitle: 'Doing',
  },
];

type RenderOptions = {
  items?: ArchivedCardItem[];
  status?: ArchivedStatus;
  language?: Language;
};

function renderColumn({
  items = twoItems,
  status = 'ready',
  language = 'pt-BR',
}: RenderOptions = {}) {
  const onRetry = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <ArchivedCardsColumn
        items={items}
        status={status}
        labels={labels}
        today={today}
        onRetry={onRetry}
      />
    </I18nextProvider>,
  );
  return { onRetry };
}

function column(name = 'Arquivadas') {
  return screen.getByRole('region', { name });
}

describe('ArchivedCardsColumn', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows a region named "Arquivadas" with the archived count in the header', () => {
    renderColumn();

    expect(column().textContent).toContain('Arquivadas');
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('looks like a virtual column, with a dashed border, no fill and an icon', () => {
    renderColumn();

    expect(column().classList.contains('border-dashed')).toBe(true);
    expect(column().classList.contains('bg-transparent')).toBe(true);
    // Card checkboxes carry svgs too, so look in the header row only.
    const header = screen.getByText('Arquivadas').parentElement;
    expect(header?.querySelector('svg')).toBeTruthy();
  });

  it('shows the cards in the given order, each with its archive date and column', () => {
    renderColumn();

    const text = column().textContent ?? '';
    expect(text.indexOf('Write release notes')).toBeLessThan(
      text.indexOf('Review PR'),
    );
    expect(text).toContain('Arquivada em 2 out, 2026 · de: To do');
    expect(text).toContain('Arquivada em 1 out, 2026 · de: Doing');
  });

  it('keeps the cards read-only, with a disabled checkbox showing the done state', () => {
    renderColumn();

    const checkboxes = screen.getAllByRole<HTMLInputElement>('checkbox');
    expect(checkboxes.map((box) => box.disabled)).toEqual([true, true]);
    expect(checkboxes.map((box) => box.checked)).toEqual([true, false]);
  });

  it('offers no menu, create field or other button', () => {
    renderColumn();

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows "Nenhuma tarefa arquivada" and a zero counter without archived cards', () => {
    renderColumn({ items: [] });

    expect(screen.getByText('Nenhuma tarefa arquivada')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('shows a busy placeholder instead of the empty text while loading', () => {
    renderColumn({ items: [], status: 'loading' });

    expect(column().querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Nenhuma tarefa arquivada')).toBeNull();
  });

  it('shows a load error that retries when the archived cards fail to load', () => {
    const { onRetry } = renderColumn({ items: [], status: 'error' });

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Nenhuma tarefa arquivada')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('speaks English when the language is en', () => {
    renderColumn({ items: [], language: 'en' });

    expect(column('Archived')).toBeTruthy();
    expect(screen.getByText('No archived tasks')).toBeTruthy();
  });
});
