import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ActiveBoardsEmpty,
  ArchivedBoardsEmpty,
} from '@/features/boards/components/boards-empty';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

function renderActiveEmpty(language: Language) {
  const onCreate = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <ActiveBoardsEmpty onCreate={onCreate} />
    </I18nextProvider>,
  );
  return { onCreate };
}

describe('ActiveBoardsEmpty', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      title: 'Crie seu primeiro quadro',
      detail:
        'Um quadro reúne as colunas e tarefas de um projeto ou de uma área da sua vida.',
      create: 'Criar quadro',
    },
    {
      language: 'en' as const,
      title: 'Create your first board',
      detail:
        'A board holds the columns and tasks for a project or an area of your life.',
      create: 'Create board',
    },
  ])(
    'shows the title, text and create button ($language)',
    ({ language, title, detail, create }) => {
      renderActiveEmpty(language);

      expect(
        screen.getByRole('heading', { level: 2, name: title }),
      ).toBeTruthy();
      expect(screen.getByText(detail)).toBeTruthy();
      expect(screen.getByRole('button', { name: create })).toBeTruthy();
    },
  );

  it('calls onCreate once when the create button is pressed', () => {
    const { onCreate } = renderActiveEmpty('pt-BR');

    fireEvent.click(screen.getByRole('button', { name: 'Criar quadro' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});

describe('ArchivedBoardsEmpty', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    { language: 'pt-BR' as const, text: 'Nenhum quadro arquivado' },
    { language: 'en' as const, text: 'No archived boards' },
  ])('shows "$text" and no button ($language)', ({ language, text }) => {
    render(
      <I18nextProvider i18n={createI18n(language)}>
        <ArchivedBoardsEmpty />
      </I18nextProvider>,
    );

    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
