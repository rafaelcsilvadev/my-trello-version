import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardToolbar } from '@/features/board/components/board-toolbar';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

function renderToolbar(showArchived = false, language: Language = 'pt-BR') {
  const onShowArchivedChange = vi.fn<(showArchived: boolean) => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <BoardToolbar
        showArchived={showArchived}
        onShowArchivedChange={onShowArchivedChange}
      />
    </I18nextProvider>,
  );
  return { onShowArchivedChange };
}

describe('BoardToolbar', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    { language: 'pt-BR' as const, label: 'Mostrar arquivadas' },
    { language: 'en' as const, label: 'Show archived' },
  ])('labels the switch ($language)', ({ language, label }) => {
    renderToolbar(false, language);

    expect(screen.getByRole('switch', { name: label })).toBeTruthy();
  });

  it.each([false, true])(
    'reflects showArchived=%s in the switch',
    (showArchived) => {
      renderToolbar(showArchived);

      const toggle = screen.getByRole<HTMLInputElement>('switch', {
        name: 'Mostrar arquivadas',
      });

      expect(toggle.checked).toBe(showArchived);
    },
  );

  it.each([
    { showArchived: false, next: true },
    { showArchived: true, next: false },
  ])(
    'calls onShowArchivedChange($next) when toggled',
    ({ showArchived, next }) => {
      const { onShowArchivedChange } = renderToolbar(showArchived);

      fireEvent.click(
        screen.getByRole('switch', { name: 'Mostrar arquivadas' }),
      );

      expect(onShowArchivedChange).toHaveBeenCalledExactlyOnceWith(next);
    },
  );
});
