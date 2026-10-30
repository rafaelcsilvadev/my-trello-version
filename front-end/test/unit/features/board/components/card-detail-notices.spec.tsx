import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';

import { CardDetailNotices } from '@/features/board/components/card-detail-notices';
import type { CardDetailMode } from '@/features/board/model/card-detail';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

afterEach(cleanup);

function renderNotices(
  mode: CardDetailMode,
  isColumnArchived: boolean,
  language: Language = 'pt-BR',
) {
  return render(
    <I18nextProvider i18n={createI18n(language)}>
      <CardDetailNotices mode={mode} isColumnArchived={isColumnArchived} />
    </I18nextProvider>,
  );
}

describe('CardDetailNotices', () => {
  it('renders nothing for an editable card', () => {
    const { container } = renderNotices('editable', false);

    expect(container.childElementCount).toBe(0);
  });

  it('shows the archived card notice as a status', () => {
    renderNotices('archivedCard', false);

    expect(screen.getByRole('status').textContent).toBe(
      'Tarefa arquivada · somente leitura',
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('adds the column archived alert for an archived card in an archived column', () => {
    renderNotices('archivedCard', true);

    expect(screen.getByRole('status').textContent).toBe(
      'Tarefa arquivada · somente leitura',
    );
    expect(screen.getByRole('alert').textContent).toBe(
      'A coluna de origem está arquivada. Restaure a coluna primeiro.',
    );
  });

  it('shows only the archived board notice, even when the column is archived', () => {
    renderNotices('archivedBoard', true);

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toBe(
      'Quadro arquivado · somente leitura',
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Tarefa arquivada · somente leitura')).toBeNull();
  });

  it('shows the notices in English', () => {
    renderNotices('archivedCard', true, 'en');

    expect(screen.getByRole('status').textContent).toBe(
      'Archived task · read-only',
    );
    expect(screen.getByRole('alert').textContent).toBe(
      'The original column is archived. Restore the column first.',
    );
  });

  it('shows the archived board notice in English', () => {
    renderNotices('archivedBoard', false, 'en');

    expect(screen.getByRole('status').textContent).toBe(
      'Archived board · read-only',
    );
  });
});
