import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CardDetailLabelPopover,
  type LabelOption,
} from '@/features/board/components/card-detail-label-popover';
import type { LabelForm } from '@/features/board/view-models/use-card-labels-view-model';
import type { Label } from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';

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

type RenderOptions = {
  isOpen?: boolean;
  query?: string;
  options?: LabelOption[];
  form?: LabelForm | null;
  isCreating?: boolean;
};

function renderPopover({
  isOpen = true,
  query = '',
  options = [
    { label: BUG, isChecked: true, isPending: false },
    { label: FEATURE, isChecked: false, isPending: false },
  ],
  form = null,
  isCreating = false,
}: RenderOptions = {}) {
  const handlers = {
    onOpenChange: vi.fn<(open: boolean) => void>(),
    onQueryChange: vi.fn<(query: string) => void>(),
    onToggle: vi.fn<(label: Label) => void>(),
    onStartCreate: vi.fn<() => void>(),
    onNameChange: vi.fn<(name: string) => void>(),
    onColorChange: vi.fn<(color: Label['color']) => void>(),
    onSubmit: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
  };
  const view = render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <CardDetailLabelPopover
        isOpen={isOpen}
        query={query}
        options={options}
        boardId="b1"
        form={form}
        isCreating={isCreating}
        {...handlers}
      />
    </I18nextProvider>,
  );
  return { ...handlers, view };
}

// An open popover hides the page behind it from the accessibility tree.
const trigger = () =>
  screen.getByRole('button', { name: 'Adicionar etiqueta', hidden: true });

describe('CardDetailLabelPopover', () => {
  afterEach(cleanup);

  it('shows the Plus icon on the trigger and calls onOpenChange(true) when pressed', async () => {
    const { onOpenChange } = renderPopover({ isOpen: false });
    expect(trigger().querySelector('svg.lucide-plus')).toBeTruthy();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(trigger());
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('marks the trigger as expanded while open', () => {
    renderPopover();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('opens a dialog named Etiquetas with focus in the search field', () => {
    renderPopover({ query: 'bu' });
    screen.getByRole('dialog', { name: 'Etiquetas' });
    const search = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Buscar etiquetas…',
    });
    expect(document.activeElement).toBe(search);
    expect(search.value).toBe('bu');
  });

  it('lists each label as a checkbox named by it, checked per props', () => {
    renderPopover();
    const bug = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Bug' });
    const feature = screen.getByRole<HTMLInputElement>('checkbox', {
      name: 'Feature',
    });
    expect(bug.checked).toBe(true);
    expect(feature.checked).toBe(false);
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('calls onToggle with the label on click', async () => {
    const { onToggle } = renderPopover();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Feature' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(FEATURE);
  });

  it('calls onToggle with the label on Space', async () => {
    const { onToggle } = renderPopover();
    screen.getByRole('checkbox', { name: 'Bug' }).focus();
    await userEvent.keyboard(' ');
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(BUG);
  });

  // A disabled input drops the focus to the body, and Esc stops closing the popover.
  it('dims the pending option, keeps it focusable and ignores its toggles', async () => {
    const { onToggle } = renderPopover({
      options: [
        { label: BUG, isChecked: true, isPending: true },
        { label: FEATURE, isChecked: false, isPending: false },
      ],
    });
    const bug = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Bug' });
    const feature = screen.getByRole<HTMLInputElement>('checkbox', {
      name: 'Feature',
    });
    expect(bug.disabled).toBe(false);
    expect(bug.closest('label')?.hasAttribute('data-pending')).toBe(true);
    expect(feature.closest('label')?.hasAttribute('data-pending')).toBe(false);
    expect(bug.closest('label')?.className).toContain(
      'data-pending:opacity-45',
    );

    bug.focus();
    await userEvent.keyboard(' ');
    await userEvent.click(bug);
    expect(document.activeElement).toBe(bug);
    expect(onToggle).not.toHaveBeenCalled();
  });

  // The name field unmounts with the form: without this the focus drops to the body.
  it('moves the focus back to the search field when the form closes', () => {
    const form: LabelForm = { name: 'Errands', color: 'blue', error: null };
    const { view, ...handlers } = renderPopover({ form });
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: 'Nome' }),
    );

    view.rerender(
      <I18nextProvider i18n={createI18n('pt-BR')}>
        <CardDetailLabelPopover
          isOpen
          query=""
          options={[]}
          boardId="b1"
          form={null}
          isCreating={false}
          {...handlers}
        />
      </I18nextProvider>,
    );
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: 'Buscar etiquetas…' }),
    );
  });

  it('calls onQueryChange while typing', async () => {
    const { onQueryChange } = renderPopover();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Buscar etiquetas…' }),
      'b',
    );
    expect(onQueryChange).toHaveBeenCalledWith('b');
  });

  it('shows Nenhuma etiqueta encontrada and no checkbox without options', () => {
    renderPopover({ query: 'zzz', options: [] });
    screen.getByText('Nenhuma etiqueta encontrada');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('calls onOpenChange(false) on Esc and returns focus to the trigger', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    // The parent owns the open state, as the view-model does.
    function Parent() {
      const [isOpen, setOpen] = useState(false);
      return (
        <I18nextProvider i18n={createI18n('pt-BR')}>
          <CardDetailLabelPopover
            isOpen={isOpen}
            query=""
            options={[]}
            onOpenChange={(open) => {
              onOpenChange(open);
              setOpen(open);
            }}
            onQueryChange={vi.fn<(query: string) => void>()}
            onToggle={vi.fn<(label: Label) => void>()}
            boardId="b1"
            form={null}
            isCreating={false}
            onStartCreate={vi.fn<() => void>()}
            onNameChange={vi.fn<(name: string) => void>()}
            onColorChange={vi.fn<(color: Label['color']) => void>()}
            onSubmit={vi.fn<() => void>()}
            onCancel={vi.fn<() => void>()}
          />
        </I18nextProvider>
      );
    }
    render(<Parent />);

    await userEvent.click(trigger());
    screen.getByRole('dialog', { name: 'Etiquetas' });
    await userEvent.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger()));
  });

  it('calls onOpenChange(false) when the trigger is pressed while open', async () => {
    const { onOpenChange } = renderPopover();
    await userEvent.click(trigger());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onStartCreate from the Criar etiqueta button', async () => {
    const { onStartCreate } = renderPopover();
    await userEvent.click(
      screen.getByRole('button', { name: 'Criar etiqueta' }),
    );
    expect(onStartCreate).toHaveBeenCalledTimes(1);
  });

  it('swaps the Criar etiqueta button for the form with the given state', () => {
    renderPopover({
      form: { name: 'Urgent', color: 'red', error: 'labelNameTaken' },
      isCreating: true,
    });
    expect(screen.queryByRole('button', { name: 'Criar etiqueta' })).toBeNull();
    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: 'Nome' }).value,
    ).toBe('Urgent');
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Vermelho' }).checked,
    ).toBe(true);
    screen.getByRole('alert');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Criar' }).disabled,
    ).toBe(true);
  });

  it('shows the Criar etiqueta button again with no form', () => {
    renderPopover({ form: null });
    expect(screen.getByRole('button', { name: 'Criar etiqueta' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Nome' })).toBeNull();
  });

  it('links Gerenciar etiquetas to the board labels page', () => {
    renderPopover();
    expect(
      screen
        .getByRole('link', { name: 'Gerenciar etiquetas' })
        .getAttribute('href'),
    ).toBe('/b/b1/labels');
  });

  it('shows both footer actions on a board with no labels', () => {
    renderPopover({ options: [] });
    expect(screen.getByRole('button', { name: 'Criar etiqueta' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Gerenciar etiquetas' }),
    ).toBeTruthy();
  });
});
