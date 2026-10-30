import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardDetailFooter } from '@/features/board/components/card-detail-footer';
import type { CardDetailMode } from '@/features/board/model/card-detail';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

afterEach(cleanup);

// Midday UTC keeps the local date on 3 Oct in any test machine time zone.
const CREATED_AT = '2026-10-03T12:00:00.000Z';

type Options = {
  mode?: CardDetailMode;
  isColumnArchived?: boolean;
  isPending?: boolean;
  language?: Language;
};

function renderFooter({
  mode = 'editable',
  isColumnArchived = false,
  isPending = false,
  language = 'pt-BR',
}: Options = {}) {
  const callbacks = {
    onMove: vi.fn<() => void>(),
    onArchive: vi.fn<() => void>(),
    onRestore: vi.fn<() => void>(),
    onDelete: vi.fn<() => void>(),
  };
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <CardDetailFooter
        createdAt={CREATED_AT}
        mode={mode}
        isColumnArchived={isColumnArchived}
        isPending={isPending}
        {...callbacks}
      />
    </I18nextProvider>,
  );
  return callbacks;
}

function button(name: string) {
  return screen.getByRole('button', { name });
}

describe('CardDetailFooter', () => {
  it('shows the creation date in PT-BR', () => {
    renderFooter();

    expect(screen.getByText('Criada em 3 out, 2026')).toBeTruthy();
  });

  it('shows the creation date in English', () => {
    renderFooter({ language: 'en' });

    expect(screen.getByText('Created Oct 3, 2026')).toBeTruthy();
  });

  it('wires Mover para… and Arquivar for an editable card', async () => {
    const user = userEvent.setup();
    const { onMove, onArchive, onRestore, onDelete } = renderFooter();

    expect(screen.getAllByRole('button')).toHaveLength(2);
    await user.click(button('Mover para…'));
    await user.click(button('Arquivar'));

    expect(onMove).toHaveBeenCalledOnce();
    expect(onArchive).toHaveBeenCalledOnce();
    expect(onRestore).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('wires Restaurar and Excluir definitivamente for an archived card', async () => {
    const user = userEvent.setup();
    const { onMove, onArchive, onRestore, onDelete } = renderFooter({
      mode: 'archivedCard',
    });

    expect(screen.getAllByRole('button')).toHaveLength(2);
    await user.click(button('Restaurar'));
    await user.click(button('Excluir definitivamente'));

    expect(onRestore).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onMove).not.toHaveBeenCalled();
    expect(onArchive).not.toHaveBeenCalled();
  });

  it('disables Restaurar and Excluir definitivamente when the column is archived', async () => {
    const user = userEvent.setup();
    const { onRestore, onDelete } = renderFooter({
      mode: 'archivedCard',
      isColumnArchived: true,
    });

    expect(button('Restaurar').hasAttribute('disabled')).toBe(true);
    expect(button('Excluir definitivamente').hasAttribute('disabled')).toBe(
      true,
    );
    await user.click(button('Restaurar'));
    await user.click(button('Excluir definitivamente'));
    expect(onRestore).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('disables Restaurar and Excluir definitivamente while a change is pending', () => {
    renderFooter({ mode: 'archivedCard', isPending: true });

    expect(button('Restaurar').hasAttribute('disabled')).toBe(true);
    expect(button('Excluir definitivamente').hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('shows only the date for a card of an archived board', () => {
    renderFooter({ mode: 'archivedBoard', isColumnArchived: true });

    expect(screen.getByText('Criada em 3 out, 2026')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows the actions in English', () => {
    renderFooter({ mode: 'archivedCard', language: 'en' });

    expect(button('Restore')).toBeTruthy();
    expect(button('Delete permanently')).toBeTruthy();
  });

  it('shows the editable actions in English', () => {
    renderFooter({ language: 'en' });

    expect(button('Move to…')).toBeTruthy();
    expect(button('Archive')).toBeTruthy();
  });
});
