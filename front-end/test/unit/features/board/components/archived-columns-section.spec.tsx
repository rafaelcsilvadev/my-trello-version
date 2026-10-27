import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArchivedColumnsSection } from '@/features/board/components/archived-columns-section';
import type { ArchivedColumnItem } from '@/features/board/model/types';
import type { ArchivedStatus } from '@/features/board/view-models/use-board-view-model';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

import { listFixture } from '../../../../support/fixtures/board';

const twoItems: ArchivedColumnItem[] = [
  {
    list: listFixture('list-1', {
      title: 'Done',
      archivedAt: '2026-10-02T12:00:00.000Z',
    }),
    cardCount: 3,
  },
  {
    list: listFixture('list-2', {
      title: 'Backlog',
      archivedAt: '2026-10-01T12:00:00.000Z',
    }),
    cardCount: 1,
  },
];

type RenderOptions = {
  items?: ArchivedColumnItem[];
  status?: ArchivedStatus;
  isReadOnly?: boolean;
  pendingIds?: ReadonlySet<string>;
  language?: Language;
};

function renderSection({
  items = twoItems,
  status = 'ready',
  isReadOnly = false,
  pendingIds = new Set<string>(),
  language = 'pt-BR',
}: RenderOptions = {}) {
  const onRestore = vi.fn<(listId: string) => void>();
  const onDelete = vi.fn<(listId: string) => void>();
  const onRetry = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <ArchivedColumnsSection
        items={items}
        status={status}
        isReadOnly={isReadOnly}
        pendingIds={pendingIds}
        onRestore={onRestore}
        onDelete={onDelete}
        onRetry={onRetry}
      />
    </I18nextProvider>,
  );
  return { onRestore, onDelete, onRetry };
}

function section(name = 'Colunas arquivadas') {
  return screen.getByRole('region', { name });
}

function item(title: string) {
  return screen.getByRole('listitem', { name: title });
}

describe('ArchivedColumnsSection', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows a region named "Colunas arquivadas" with the archived count in the header', () => {
    renderSection();

    expect(section().textContent).toContain('Colunas arquivadas');
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows the columns in the given order, each with its archive date and card count', () => {
    renderSection();

    const text = section().textContent ?? '';
    expect(text.indexOf('Done')).toBeLessThan(text.indexOf('Backlog'));
    expect(item('Done').textContent).toContain(
      'Arquivada em 2 out, 2026·3 tarefas',
    );
    expect(item('Backlog').textContent).toContain(
      'Arquivada em 1 out, 2026·1 tarefa',
    );
  });

  it('says "0 tarefas" for an empty column and leaves the count out while it loads', () => {
    renderSection({
      items: [
        { list: listFixture('list-1', { title: 'Done' }), cardCount: 0 },
        {
          list: listFixture('list-2', { title: 'Backlog' }),
          cardCount: undefined,
        },
      ],
    });

    expect(item('Done').textContent).toContain('0 tarefas');
    expect(item('Backlog').textContent).not.toContain('tarefa');
  });

  it('calls back with the column id on Restaurar and Excluir definitivamente', () => {
    const { onRestore, onDelete } = renderSection();

    fireEvent.click(
      within(item('Backlog')).getByRole('button', { name: 'Restaurar' }),
    );
    fireEvent.click(
      within(item('Done')).getByRole('button', {
        name: 'Excluir definitivamente',
      }),
    );

    expect(onRestore).toHaveBeenCalledExactlyOnceWith('list-2');
    expect(onDelete).toHaveBeenCalledExactlyOnceWith('list-1');
  });

  it('hides the actions on a read-only board', () => {
    renderSection({ isReadOnly: true });

    expect(screen.queryByRole('button')).toBeNull();
    expect(item('Done').textContent).toContain('3 tarefas');
  });

  it('disables the actions and shows a spinner on a pending column', () => {
    renderSection({ pendingIds: new Set(['list-1']) });

    const pending = within(item('Done'));
    expect(
      pending.getByRole<HTMLButtonElement>('button', { name: 'Restaurar' })
        .disabled,
    ).toBe(true);
    expect(
      pending.getByRole<HTMLButtonElement>('button', {
        name: 'Excluir definitivamente',
      }).disabled,
    ).toBe(true);
    expect(pending.getByText('Salvando…')).toBeTruthy();
    expect(
      within(item('Backlog')).getByRole<HTMLButtonElement>('button', {
        name: 'Restaurar',
      }).disabled,
    ).toBe(false);
  });

  it('shows "Nenhuma coluna arquivada" and a zero counter without archived columns', () => {
    renderSection({ items: [] });

    expect(screen.getByText('Nenhuma coluna arquivada')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('shows a busy placeholder instead of the empty text while loading', () => {
    renderSection({ items: [], status: 'loading' });

    expect(section().querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Nenhuma coluna arquivada')).toBeNull();
  });

  it('shows a load error that retries when the archived columns fail to load', () => {
    const { onRetry } = renderSection({ items: [], status: 'error' });

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Nenhuma coluna arquivada')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('speaks English when the language is en', () => {
    renderSection({ language: 'en' });

    expect(section('Archived columns')).toBeTruthy();
    expect(item('Done').textContent).toContain('Archived Oct 2, 2026');
    expect(item('Done').textContent).toContain('3 tasks');
    expect(item('Backlog').textContent).toContain('1 task');
    expect(screen.getAllByRole('button', { name: 'Restore' })).toHaveLength(2);
    expect(
      screen.getAllByRole('button', { name: 'Delete permanently' }),
    ).toHaveLength(2);
  });
});
