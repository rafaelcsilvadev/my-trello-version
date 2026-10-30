import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardDetailDescription } from '@/features/board/components/card-detail-description';
import { createI18n } from '@/shared/i18n/i18n';

afterEach(cleanup);

type Props = ComponentProps<typeof CardDetailDescription>;

function renderDescription(overrides: Partial<Props> = {}) {
  const props: Props = {
    description: null,
    draft: null,
    error: null,
    isDisabled: false,
    onChange: vi.fn<(value: string) => void>(),
    onSave: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
    ...overrides,
  };
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <CardDetailDescription {...props} />
    </I18nextProvider>,
  );
  return { props };
}

function textArea() {
  return screen.getByRole<HTMLTextAreaElement>('textbox', {
    name: 'Descrição',
  });
}

function saveButton() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Salvar' });
}

describe('CardDetailDescription', () => {
  it('shows the saved description and its counter without a draft', () => {
    renderDescription({ description: 'Resumo' });

    expect(textArea().value).toBe('Resumo');
    expect(screen.getByText('6 / 5000')).toBeTruthy();
  });

  it('reads "0 / 5000" for an empty description', () => {
    renderDescription();

    expect(textArea().value).toBe('');
    expect(textArea().getAttribute('placeholder')).toBe(
      'Adicione mais detalhes…',
    );
    expect(screen.getByText('0 / 5000')).toBeTruthy();
  });

  it('shows the draft and counts its characters', () => {
    renderDescription({ description: 'Resumo', draft: 'Resumo da versão' });

    expect(textArea().value).toBe('Resumo da versão');
    expect(screen.getByText('16 / 5000')).toBeTruthy();
  });

  it('reports typed text through onChange', () => {
    const { props } = renderDescription();

    fireEvent.change(textArea(), { target: { value: 'Novo' } });

    expect(props.onChange).toHaveBeenCalledExactlyOnceWith('Novo');
  });

  it('hides Salvar and Cancelar while the draft matches the saved description', () => {
    renderDescription({ description: 'Resumo', draft: 'Resumo' });

    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
  });

  it('hides Salvar and Cancelar when an empty draft matches no description', () => {
    renderDescription({ description: null, draft: '' });

    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();
  });

  it('saves through Salvar while dirty', async () => {
    const { props } = renderDescription({ draft: 'Novo' });

    await userEvent.setup().click(saveButton());

    expect(props.onSave).toHaveBeenCalledOnce();
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('cancels through Cancelar while dirty', async () => {
    const { props } = renderDescription({ description: 'Resumo', draft: '' });

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(props.onCancel).toHaveBeenCalledOnce();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('shows the error and disables Salvar when the draft is too long', () => {
    renderDescription({
      draft: 'a'.repeat(5001),
      error: 'cardDescriptionTooLong',
    });

    expect(screen.getByText('Use até 5000 caracteres')).toBeTruthy();
    expect(textArea().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('5001 / 5000')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Cancelar' })
        .disabled,
    ).toBe(false);
  });

  it('disables the textarea when disabled', () => {
    renderDescription({ description: 'Resumo', isDisabled: true });

    expect(textArea().disabled).toBe(true);
  });
});
