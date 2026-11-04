import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LabelsList,
  type LabelsListProps,
} from '@/features/board/components/labels-list';
import { usageText } from '@/features/board/model/label-usage';
import { createI18n } from '@/shared/i18n/i18n';

import { labelFixture } from '../../../../support/fixtures/board';

const rows: LabelsListProps['rows'] = [
  {
    label: labelFixture('l1', { name: 'Urgent', color: 'red' }),
    usage: usageText(3),
    pending: false,
  },
  {
    label: labelFixture('l2', { name: 'Bug', color: 'blue' }),
    usage: usageText(0),
    pending: false,
  },
  {
    label: labelFixture('l3', { name: 'Docs', color: 'green' }),
    usage: usageText(1),
    pending: false,
  },
];

function renderList(props: Partial<LabelsListProps> = {}) {
  const onEdit = vi.fn<(id: string) => void>();
  const onDelete = vi.fn<(id: string) => void>();
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <LabelsList
        rows={rows}
        readOnly={false}
        onEdit={onEdit}
        onDelete={onDelete}
        {...props}
      />
    </I18nextProvider>,
  );
  return { onEdit, onDelete };
}

describe('LabelsList', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps the rows in the given order, each with its chip', () => {
    renderList();

    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Urgent'),
      expect.stringContaining('Bug'),
      expect.stringContaining('Docs'),
    ]);
  });

  it('shows não usada, usada em 1 tarefa and usada em N tarefas', () => {
    renderList();

    const [urgent, bug, docs] = screen.getAllByRole('listitem');
    expect(within(urgent).getByText('usada em 3 tarefas')).toBeTruthy();
    expect(within(bug).getByText('não usada')).toBeTruthy();
    expect(within(docs).getByText('usada em 1 tarefa')).toBeTruthy();
  });

  it('names the buttons after the label and shows the pencil and trash icons', () => {
    renderList();

    const edit = screen.getByRole('button', { name: 'Editar etiqueta Urgent' });
    const remove = screen.getByRole('button', {
      name: 'Excluir etiqueta Urgent',
    });
    expect(edit.querySelector('svg.lucide-pencil')).toBeTruthy();
    expect(remove.querySelector('svg.lucide-trash-2')).toBeTruthy();
  });

  it('calls onEdit and onDelete with the id of the row', async () => {
    const user = userEvent.setup();
    const { onEdit, onDelete } = renderList();

    await user.click(
      screen.getByRole('button', { name: 'Editar etiqueta Bug' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Excluir etiqueta Docs' }),
    );

    expect(onEdit.mock.calls).toEqual([['l2']]);
    expect(onDelete.mock.calls).toEqual([['l3']]);
  });

  it('disables and dims both buttons of a pending row only', () => {
    renderList({
      rows: rows.map((row) => ({ ...row, pending: row.label.id === 'l2' })),
    });

    const [urgent, bug] = screen.getAllByRole('listitem');
    for (const button of within(bug).getAllByRole<HTMLButtonElement>(
      'button',
    )) {
      expect(button.disabled).toBe(true);
      expect(button.classList.contains('disabled:opacity-45')).toBe(true);
    }
    for (const button of within(urgent).getAllByRole<HTMLButtonElement>(
      'button',
    )) {
      expect(button.disabled).toBe(false);
    }
  });

  it('hides both buttons when read-only but keeps chip and usage', () => {
    renderList({ readOnly: true });

    expect(screen.queryAllByRole('button')).toEqual([]);
    const [urgent] = screen.getAllByRole('listitem');
    expect(within(urgent).getByText('Urgent')).toBeTruthy();
    expect(within(urgent).getByText('usada em 3 tarefas')).toBeTruthy();
  });
});
