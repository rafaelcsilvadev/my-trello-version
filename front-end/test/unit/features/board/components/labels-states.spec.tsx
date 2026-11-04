import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LabelsEmpty,
  LabelsSkeleton,
} from '@/features/board/components/labels-states';
import { createI18n } from '@/shared/i18n/i18n';

function renderEmpty(readOnly: boolean) {
  const onCreate = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <LabelsEmpty readOnly={readOnly} onCreate={onCreate} />
    </I18nextProvider>,
  );
  return { onCreate };
}

describe('LabelsEmpty', () => {
  afterEach(cleanup);

  it('shows the title and the detail (FLP-04)', () => {
    renderEmpty(false);

    expect(
      screen.getByRole('heading', { name: 'Nenhuma etiqueta ainda' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Crie etiquetas para destacar tarefas, como Bug ou Urgent.',
      ),
    ).toBeTruthy();
  });

  it('calls onCreate from the Nova etiqueta button (FLP-04)', async () => {
    const { onCreate } = renderEmpty(false);

    await userEvent.click(
      screen.getByRole('button', { name: 'Nova etiqueta' }),
    );

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('hides the button but keeps the texts when read only (FLP-38)', () => {
    renderEmpty(true);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Nenhuma etiqueta ainda')).toBeTruthy();
  });
});

describe('LabelsSkeleton', () => {
  afterEach(cleanup);

  it('marks its container busy and renders rows with no text (FLP-05)', () => {
    const { container } = render(<LabelsSkeleton />);

    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(busy?.children.length).toBeGreaterThan(1);
    expect(busy?.textContent).toBe('');
  });
});
