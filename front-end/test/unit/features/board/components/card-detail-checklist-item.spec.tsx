import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardDetailChecklistItem } from '@/features/board/components/card-detail-checklist-item';
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
});
