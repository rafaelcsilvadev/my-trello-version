import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardDetailLabels } from '@/features/board/components/card-detail-labels';
import type { Label } from '@/features/board/model/types';
import type { useCardLabelsViewModel } from '@/features/board/view-models/use-card-labels-view-model';
import { createI18n } from '@/shared/i18n/i18n';

type ViewModel = ReturnType<typeof useCardLabelsViewModel>;

function label(id: string, name: string, color: Label['color']): Label {
  return {
    id,
    boardId: 'b1',
    name,
    color,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

const BUG = label('l1', 'Bug', 'red');
const FEATURE = label('l2', 'Feature', 'green');

function renderLabels({
  applied = [BUG, FEATURE],
  isEditable = true,
  isOpen = false,
}: { applied?: Label[]; isEditable?: boolean; isOpen?: boolean } = {}) {
  const state: ViewModel['state'] = {
    isOpen,
    query: 'fe',
    options: [{ label: FEATURE, isChecked: true, isPending: false }],
    form: null,
    isCreating: false,
  };
  const actions: ViewModel['actions'] = {
    setOpen: vi.fn<(open: boolean) => void>(),
    setQuery: vi.fn<ViewModel['actions']['setQuery']>(),
    toggle: vi.fn<(label: Label) => void>(),
    startCreate: vi.fn<() => void>(),
    setName: vi.fn<(name: string) => void>(),
    setColor: vi.fn<(color: Label['color']) => void>(),
    cancelCreate: vi.fn<() => void>(),
    submitCreate: vi.fn<() => void>(),
  };
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <CardDetailLabels
        applied={applied}
        isEditable={isEditable}
        boardId="b1"
        state={state}
        actions={actions}
      />
    </I18nextProvider>,
  );
  return actions;
}

const addButton = () =>
  screen.queryByRole('button', { name: 'Adicionar etiqueta', hidden: true });

describe('CardDetailLabels', () => {
  afterEach(cleanup);

  it('editable with chips: shows the chips in the given order, then the add button', () => {
    renderLabels();
    screen.getByText('Etiquetas');
    const list = screen.getByRole('list', { name: 'Etiquetas' });
    const names = within(list)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(names).toEqual(['Bug', 'Feature']);
    const add = addButton();
    expect(add).not.toBeNull();
    expect(
      list.compareDocumentPosition(add!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('editable with no chips: shows the heading and the add button only', () => {
    renderLabels({ applied: [] });
    screen.getByText('Etiquetas');
    expect(addButton()).not.toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('read-only with chips: shows the chips and no add button', () => {
    renderLabels({ applied: [BUG], isEditable: false });
    const list = screen.getByRole('list', { name: 'Etiquetas' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(addButton()).toBeNull();
  });

  it('read-only with no chips: renders nothing', () => {
    renderLabels({ applied: [], isEditable: false });
    expect(screen.queryByText('Etiquetas')).toBeNull();
    expect(addButton()).toBeNull();
  });

  it('passes the popover its state and actions', async () => {
    const actions = renderLabels({ isOpen: true });
    const search = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Buscar etiquetas…',
    });
    expect(search.value).toBe('fe');
    const feature = screen.getByRole<HTMLInputElement>('checkbox', {
      name: 'Feature',
    });
    expect(feature.checked).toBe(true);
    await userEvent.click(feature);
    expect(actions.toggle).toHaveBeenCalledWith(FEATURE);
  });
});
