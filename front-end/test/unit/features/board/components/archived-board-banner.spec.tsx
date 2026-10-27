import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArchivedBoardBanner } from '@/features/board/components/archived-board-banner';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

function renderBanner(isPending = false, language: Language = 'pt-BR') {
  const onRestore = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <ArchivedBoardBanner isPending={isPending} onRestore={onRestore} />
    </I18nextProvider>,
  );
  return { onRestore };
}

describe('ArchivedBoardBanner', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      text: 'Quadro arquivado · somente leitura',
      restore: 'Restaurar',
    },
    {
      language: 'en' as const,
      text: 'Board archived · read-only',
      restore: 'Restore',
    },
  ])(
    'shows the read-only status with a restore button ($language)',
    ({ language, text, restore }) => {
      renderBanner(false, language);

      expect(screen.getByRole('status').textContent).toContain(text);
      expect(screen.getByRole('button', { name: restore })).toBeTruthy();
    },
  );

  it('calls onRestore when Restaurar is pressed', () => {
    const { onRestore } = renderBanner();

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));

    expect(onRestore).toHaveBeenCalledOnce();
  });

  it('disables Restaurar while the restore is pending', () => {
    const { onRestore } = renderBanner(true);

    const restore = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Restaurar',
    });
    fireEvent.click(restore);

    expect(restore.disabled).toBe(true);
    expect(onRestore).not.toHaveBeenCalled();
  });
});
