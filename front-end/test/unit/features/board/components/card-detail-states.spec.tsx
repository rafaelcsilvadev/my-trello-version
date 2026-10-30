import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CardDetailNotFound,
  CardDetailSkeleton,
} from '@/features/board/components/card-detail-states';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

afterEach(cleanup);

describe('CardDetailSkeleton', () => {
  it('marks itself busy and shows field placeholders without controls', () => {
    const { container } = render(<CardDetailSkeleton />);

    const skeleton = container.firstElementChild;
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');
    expect(skeleton?.children.length).toBeGreaterThan(0);
    expect(
      screen.queryAllByRole('textbox').length +
        screen.queryAllByRole('checkbox').length +
        screen.queryAllByRole('button').length,
    ).toBe(0);
  });
});

describe('CardDetailNotFound', () => {
  function renderNotFound(language: Language) {
    const onClose = vi.fn<() => void>();
    render(
      <I18nextProvider i18n={createI18n(language)}>
        <CardDetailNotFound onClose={onClose} />
      </I18nextProvider>,
    );
    return { onClose };
  }

  it.each([
    {
      language: 'pt-BR' as const,
      title: 'Esta tarefa não existe mais',
      detail: 'Ela pode ter sido excluída em outro dispositivo.',
      close: 'Fechar',
    },
    {
      language: 'en' as const,
      title: 'This task no longer exists',
      detail: 'It may have been deleted on another device.',
      close: 'Close',
    },
  ])(
    'shows the title and detail in an alert, and the close button calls onClose ($language)',
    async ({ language, title, detail, close }) => {
      const { onClose } = renderNotFound(language);

      const alert = screen.getByRole('alert');
      expect(
        screen.getByRole('heading', { level: 2, name: title }),
      ).toBeTruthy();
      expect(alert.textContent).toContain(detail);

      await userEvent
        .setup()
        .click(screen.getByRole('button', { name: close }));

      expect(onClose).toHaveBeenCalledOnce();
    },
  );
});
