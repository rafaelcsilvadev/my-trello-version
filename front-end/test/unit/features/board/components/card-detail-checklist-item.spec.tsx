import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, KeyboardEvent } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CardDetailChecklistItem,
  type ItemMove,
} from '@/features/board/components/card-detail-checklist-item';
import type { MoveInput } from '@/features/board/model/move';
import { createI18n } from '@/shared/i18n/i18n';

import { checklistItem } from '../../../../support/fixtures/board';

afterEach(cleanup);

type Props = ComponentProps<typeof CardDetailChecklistItem>;

function renderItem(overrides: Partial<Props> = {}) {
  const props: Props = {
    item: checklistItem('i1', 'c1', { text: 'Escrever testes' }),
    draft: undefined,
    isInvalid: false,
    isPending: false,
    isDisabled: false,
    onToggle: vi.fn<() => void>(),
    onChange: vi.fn<(value: string) => void>(),
    onSubmit: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
    onDelete: vi.fn<() => void>(),
    movable: null,
    ...overrides,
  };
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <CardDetailChecklistItem {...props} />
    </I18nextProvider>,
  );
  return { props };
}

const checkbox = () =>
  screen.getByRole<HTMLInputElement>('checkbox', { name: 'Escrever testes' });
const textbox = () =>
  screen.getByRole<HTMLInputElement>('textbox', {
    name: 'Editar item “Escrever testes”',
  });
const deleteButton = () =>
  screen.queryByRole<HTMLButtonElement>('button', {
    name: 'Excluir item “Escrever testes”',
  });

function move(overrides: Partial<ItemMove> = {}): ItemMove {
  return {
    canDrag: true,
    isLifted: false,
    isPicked: false,
    onStart: vi.fn<(input: MoveInput) => void>(),
    onKey: vi.fn<(event: KeyboardEvent<HTMLButtonElement>) => void>(),
    ...overrides,
  };
}

const grip = () =>
  screen.queryByRole<HTMLButtonElement>('button', {
    name: 'Reordenar o item Escrever testes',
  });

describe('CardDetailChecklistItem', () => {
  it('names the checkbox, the field and the delete button by the saved text (FCL-08)', () => {
    renderItem({ draft: 'Escrever mais testes' });

    expect(checkbox()).toBeTruthy();
    expect(textbox()).toBeTruthy();
    expect(deleteButton()).toBeTruthy();
  });

  it('shows the saved text, or the draft when there is one', () => {
    renderItem();
    expect(textbox().value).toBe('Escrever testes');
    cleanup();

    renderItem({ draft: 'Escrever mais testes' });
    expect(textbox().value).toBe('Escrever mais testes');
  });

  it('reports typing', async () => {
    const { props } = renderItem();

    await userEvent.setup().type(textbox(), '!');

    expect(props.onChange).toHaveBeenLastCalledWith('Escrever testes!');
  });

  it('toggles through the checkbox', async () => {
    const { props } = renderItem();

    await userEvent.setup().click(checkbox());

    expect(props.onToggle).toHaveBeenCalledOnce();
  });

  it('deletes through the delete button', async () => {
    const { props } = renderItem();

    await userEvent.setup().click(deleteButton()!);

    expect(props.onDelete).toHaveBeenCalledOnce();
  });

  it('submits on Enter (FCL-22)', async () => {
    const { props } = renderItem();
    const user = userEvent.setup();

    await user.click(textbox());
    await user.keyboard('{Enter}');

    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it('submits on blur (FCL-22)', async () => {
    const { props } = renderItem();
    const user = userEvent.setup();

    await user.click(textbox());
    await user.tab();

    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it('cancels on Esc without letting the key reach the dialog (FCL-30)', () => {
    const { props } = renderItem();
    // Stands in for the modal, which closes on a bubbled Esc.
    const onAncestorKeyDown = vi.fn<() => void>();
    document.body.addEventListener('keydown', onAncestorKeyDown);

    const notPrevented = fireEvent.keyDown(textbox(), { key: 'Escape' });
    document.body.removeEventListener('keydown', onAncestorKeyDown);

    expect(props.onCancel).toHaveBeenCalledOnce();
    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(notPrevented).toBe(false);
    expect(onAncestorKeyDown).not.toHaveBeenCalled();
  });

  it('checks the checkbox and strikes the text through and dims it when done (FCL-09)', () => {
    renderItem({
      item: checklistItem('i1', 'c1', { text: 'Escrever testes', done: true }),
    });

    expect(checkbox().checked).toBe(true);
    expect(textbox().classList.contains('line-through')).toBe(true);
    expect(textbox().classList.contains('text-text-tertiary')).toBe(true);
  });

  it('leaves the checkbox clear and the text plain when not done', () => {
    renderItem();

    expect(checkbox().checked).toBe(false);
    expect(textbox().classList.contains('line-through')).toBe(false);
    expect(textbox().classList.contains('text-text-tertiary')).toBe(false);
  });

  it('marks the field invalid only when isInvalid', () => {
    renderItem({ isInvalid: true });
    expect(textbox().getAttribute('aria-invalid')).toBe('true');
    cleanup();

    renderItem();
    expect(textbox().getAttribute('aria-invalid')).toBeNull();
  });

  it('disables the checkbox and the delete button, not the text, while pending (FCL-17)', () => {
    renderItem({ isPending: true });

    expect(checkbox().disabled).toBe(true);
    expect(deleteButton()!.disabled).toBe(true);
    expect(textbox().disabled).toBe(false);
  });

  it('disables the checkbox and the text and hides delete when isDisabled (FCL-31, FCL-32)', () => {
    renderItem({ isDisabled: true });

    expect(checkbox().disabled).toBe(true);
    expect(textbox().disabled).toBe(true);
    expect(textbox().classList.contains('disabled:text-text-disabled')).toBe(
      true,
    );
    expect(deleteButton()).toBeNull();
  });

  describe('grip', () => {
    it('names the grip by the item text and shows the focus outline (FCLD-01, FCLD-07)', () => {
      renderItem({ movable: move() });

      expect(grip()).toBeTruthy();
      expect(grip()!.getAttribute('data-item-grip-id')).toBe('i1');
      expect(grip()!.disabled).toBe(false);
      expect(grip()!.classList.contains('focus-visible:outline-2')).toBe(true);
    });

    it('renders no grip in the read-only modes (FCLD-24)', () => {
      renderItem();

      expect(grip()).toBeNull();
    });

    it('disables the grip while the item cannot move, unless it is picked (FCLD-22)', () => {
      renderItem({ movable: move({ canDrag: false }) });
      expect(grip()!.disabled).toBe(true);
      cleanup();

      renderItem({ movable: move({ canDrag: false, isPicked: true }) });
      expect(grip()!.disabled).toBe(false);
    });

    it('picks the item on Space (FCLD-07)', () => {
      const movable = move();
      renderItem({ movable });

      const notPrevented = fireEvent.keyDown(grip()!, { key: ' ' });

      expect(movable.onStart).toHaveBeenCalledExactlyOnceWith('keyboard');
      expect(movable.onKey).not.toHaveBeenCalled();
      expect(notPrevented).toBe(false);
    });

    it('ignores the other keys while not picked', () => {
      const movable = move();
      renderItem({ movable });

      const notPrevented = fireEvent.keyDown(grip()!, { key: 'ArrowDown' });

      expect(movable.onStart).not.toHaveBeenCalled();
      expect(movable.onKey).not.toHaveBeenCalled();
      expect(notPrevented).toBe(true);
    });

    it.each(['ArrowUp', 'ArrowDown', ' ', 'Enter', 'Escape'])(
      'hands %j to onKey while picked and prevents its default (FCLD-08, FCLD-11, FCLD-14)',
      (key) => {
        const movable = move({ isPicked: true });
        renderItem({ movable });

        const notPrevented = fireEvent.keyDown(grip()!, { key });

        expect(movable.onKey).toHaveBeenCalledOnce();
        expect(vi.mocked(movable.onKey).mock.calls[0]![0].key).toBe(key);
        expect(movable.onStart).not.toHaveBeenCalled();
        expect(notPrevented).toBe(false);
      },
    );

    it('leaves the other keys alone while picked', () => {
      const movable = move({ isPicked: true });
      renderItem({ movable });

      const notPrevented = fireEvent.keyDown(grip()!, { key: 'Tab' });

      expect(movable.onKey).not.toHaveBeenCalled();
      expect(notPrevented).toBe(true);
    });

    it('keeps Esc on a picked grip from reaching the dialog (FCLD-14)', () => {
      renderItem({ movable: move({ isPicked: true }) });
      const onAncestorKeyDown = vi.fn<() => void>();
      document.body.addEventListener('keydown', onAncestorKeyDown);

      fireEvent.keyDown(grip()!, { key: 'Escape' });
      document.body.removeEventListener('keydown', onAncestorKeyDown);

      expect(onAncestorKeyDown).not.toHaveBeenCalled();
    });

    it('lets ↑ on a picked grip bubble', () => {
      renderItem({ movable: move({ isPicked: true }) });
      const onAncestorKeyDown = vi.fn<() => void>();
      document.body.addEventListener('keydown', onAncestorKeyDown);

      fireEvent.keyDown(grip()!, { key: 'ArrowUp' });
      document.body.removeEventListener('keydown', onAncestorKeyDown);

      expect(onAncestorKeyDown).toHaveBeenCalledOnce();
    });

    it('highlights the lifted row (FCLD-08)', () => {
      renderItem({ movable: move({ isPicked: true, isLifted: true }) });
      const row = grip()!.parentElement!;
      expect(row.classList.contains('bg-brand-soft')).toBe(true);
      cleanup();

      renderItem({ movable: move() });
      expect(grip()!.parentElement!.classList.contains('bg-brand-soft')).toBe(
        false,
      );
    });
  });
});
