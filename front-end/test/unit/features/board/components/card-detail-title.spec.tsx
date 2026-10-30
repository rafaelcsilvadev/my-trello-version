import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardDetailTitle } from '@/features/board/components/card-detail-title';
import type { DateParts } from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';

import { cardFixture } from '../../../../support/fixtures/board';

afterEach(cleanup);

const today: DateParts = { year: 2026, month: 10, day: 30 };

type Props = ComponentProps<typeof CardDetailTitle>;

function renderTitle(overrides: Partial<Props> = {}) {
  const props: Props = {
    card: cardFixture('c1', 'list-1', { title: 'Escrever o README' }),
    draft: null,
    today,
    error: null,
    isDisabled: false,
    onToggleDone: vi.fn<() => void>(),
    onChange: vi.fn<(value: string) => void>(),
    onSubmit: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
    ...overrides,
  };
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <CardDetailTitle {...props} />
    </I18nextProvider>,
  );
  return { props };
}

// The checkbox label is also "Concluída", so the badge is the text outside it.
function badges(text: string) {
  return screen.queryAllByText(text).filter((el) => !el.closest('label'));
}

describe('CardDetailTitle', () => {
  it('toggles done through the checkbox named "Concluída"', async () => {
    const { props } = renderTitle();

    await userEvent
      .setup()
      .click(screen.getByRole('checkbox', { name: 'Concluída' }));

    expect(props.onToggleDone).toHaveBeenCalledOnce();
  });

  it('checks the checkbox and shows the "Concluída" badge only when done', () => {
    renderTitle({ card: cardFixture('c1', 'list-1', { done: true }) });

    expect(
      screen.getByRole<HTMLInputElement>('checkbox', { name: 'Concluída' })
        .checked,
    ).toBe(true);
    expect(badges('Concluída')).toHaveLength(1);
  });

  it('hides the "Concluída" badge when not done', () => {
    renderTitle({ card: cardFixture('c1', 'list-1', { done: false }) });

    expect(badges('Concluída')).toHaveLength(0);
  });

  it.each([
    {
      case: 'not done and due yesterday',
      done: false,
      dueDate: '2026-10-29',
      shown: true,
    },
    {
      case: 'not done and due today',
      done: false,
      dueDate: '2026-10-30',
      shown: false,
    },
    {
      case: 'not done without a due date',
      done: false,
      dueDate: null,
      shown: false,
    },
    {
      case: 'done and due yesterday',
      done: true,
      dueDate: '2026-10-29',
      shown: false,
    },
  ])(
    'shows "Atrasada" only when $case is overdue ($shown)',
    ({ done, dueDate, shown }) => {
      renderTitle({ card: cardFixture('c1', 'list-1', { done, dueDate }) });

      expect(badges('Atrasada')).toHaveLength(shown ? 1 : 0);
    },
  );

  it('shows the saved title, or the draft when there is one', () => {
    renderTitle({ draft: 'Novo título' });

    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: 'Título' }).value,
    ).toBe('Novo título');
  });

  it('shows the saved title without a draft and reports typing', async () => {
    const { props } = renderTitle();
    const input = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Título',
    });
    expect(input.value).toBe('Escrever o README');

    await userEvent.setup().type(input, '!');

    expect(props.onChange).toHaveBeenLastCalledWith('Escrever o README!');
  });

  it('submits on Enter', async () => {
    const { props } = renderTitle();
    const user = userEvent.setup();

    await user.click(screen.getByRole('textbox', { name: 'Título' }));
    await user.keyboard('{Enter}');

    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it('submits on blur', async () => {
    const { props } = renderTitle();
    const user = userEvent.setup();

    await user.click(screen.getByRole('textbox', { name: 'Título' }));
    await user.tab();

    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it('cancels on Esc without letting the key reach the dialog (FCD-46)', () => {
    const { props } = renderTitle();
    // Stands in for the modal, which closes on a bubbled Esc.
    const onAncestorKeyDown = vi.fn<() => void>();
    document.body.addEventListener('keydown', onAncestorKeyDown);

    const notPrevented = fireEvent.keyDown(
      screen.getByRole('textbox', { name: 'Título' }),
      { key: 'Escape' },
    );
    document.body.removeEventListener('keydown', onAncestorKeyDown);

    expect(props.onCancel).toHaveBeenCalledOnce();
    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(notPrevented).toBe(false);
    expect(onAncestorKeyDown).not.toHaveBeenCalled();
  });

  it.each([
    { error: 'cardTitleRequired' as const, message: 'Dê um título à tarefa' },
    { error: 'cardTitleTooLong' as const, message: 'Use até 100 caracteres' },
  ])(
    'shows "$message" under the field and marks it invalid',
    ({ error, message }) => {
      renderTitle({ error });

      const input = screen.getByRole('textbox', { name: 'Título' });
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByText(message)).toBeTruthy();
      expect(input.getAttribute('aria-describedby')).toContain(
        screen.getByText(message).id,
      );
    },
  );

  it('is valid and shows no message without an error', () => {
    renderTitle();

    const input = screen.getByRole('textbox', { name: 'Título' });
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(screen.queryByText('Dê um título à tarefa')).toBeNull();
  });

  it('disables the checkbox and the input when isDisabled', () => {
    renderTitle({ isDisabled: true });

    expect(
      screen.getByRole<HTMLInputElement>('checkbox', { name: 'Concluída' })
        .disabled,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: 'Título' })
        .disabled,
    ).toBe(true);
  });

  it('dims the title input when disabled, like the other read-only fields', () => {
    renderTitle({ isDisabled: true });

    expect(
      screen
        .getByRole('textbox', { name: 'Título' })
        .classList.contains('disabled:text-text-disabled'),
    ).toBe(true);
  });
});
