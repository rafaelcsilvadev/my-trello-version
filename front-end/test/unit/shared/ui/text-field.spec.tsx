import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextField } from '@/shared/ui/text-field';

function describedByText(input: HTMLElement): string {
  return (input.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent)
    .join(' | ');
}

describe('TextField', () => {
  afterEach(() => {
    cleanup();
  });

  it('names the input with its label', () => {
    render(<TextField label="E-mail" value="" onChange={() => {}} />);

    expect(screen.getByRole('textbox', { name: 'E-mail' })).toBeTruthy();
  });

  it('shows the value and reports typed text through onChange', () => {
    const onChange = vi.fn<(value: string) => void>();
    render(<TextField label="Nome" value="Ana" onChange={onChange} />);

    const input = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Nome',
    });
    fireEvent.change(input, { target: { value: 'Ana Lima' } });

    expect(input.value).toBe('Ana');
    expect(onChange).toHaveBeenCalledWith('Ana Lima');
  });

  it('references the hint through aria-describedby', () => {
    render(
      <TextField
        label="Senha"
        value=""
        onChange={() => {}}
        hint="Use de 8 a 72 caracteres"
      />,
    );

    expect(describedByText(screen.getByLabelText('Senha'))).toBe(
      'Use de 8 a 72 caracteres',
    );
  });

  it('marks the input invalid and shows the error referenced by aria-describedby', () => {
    render(
      <TextField
        label="Senha"
        value=""
        onChange={() => {}}
        hint="Use de 8 a 72 caracteres"
        error="A senha deve ter de 8 a 72 caracteres"
      />,
    );

    const input = screen.getByLabelText('Senha');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(
      screen.getByText('A senha deve ter de 8 a 72 caracteres'),
    ).toBeTruthy();
    expect(describedByText(input)).toContain(
      'A senha deve ter de 8 a 72 caracteres',
    );
  });

  it('hides the hint while an error is shown', () => {
    render(
      <TextField
        label="Senha"
        value=""
        onChange={() => {}}
        hint="Use de 8 a 72 caracteres"
        error="Use de 8 a 72 caracteres"
      />,
    );

    expect(screen.getAllByText('Use de 8 a 72 caracteres')).toHaveLength(1);
    expect(describedByText(screen.getByLabelText('Senha'))).toBe(
      'Use de 8 a 72 caracteres',
    );
  });

  it('has no aria-invalid and no error text without an error', () => {
    render(<TextField label="E-mail" value="" onChange={() => {}} />);

    const input = screen.getByLabelText('E-mail');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('forwards type and autoComplete to the input', () => {
    render(
      <TextField
        label="Senha"
        value=""
        onChange={() => {}}
        type="password"
        autoComplete="current-password"
      />,
    );

    const input = screen.getByLabelText('Senha');
    expect(input.getAttribute('type')).toBe('password');
    expect(input.getAttribute('autocomplete')).toBe('current-password');
  });

  it('defaults to a text input', () => {
    render(<TextField label="Nome" value="" onChange={() => {}} />);

    expect(screen.getByLabelText('Nome').getAttribute('type')).toBe('text');
  });

  it('shows the placeholder on the input when given', () => {
    render(
      <TextField
        label="Nome"
        value=""
        onChange={() => {}}
        placeholder="Ex.: Lançamento Q3"
      />,
    );

    expect(screen.getByLabelText('Nome').getAttribute('placeholder')).toBe(
      'Ex.: Lançamento Q3',
    );
  });

  it('has no placeholder when omitted', () => {
    render(<TextField label="Nome" value="" onChange={() => {}} />);

    expect(screen.getByLabelText('Nome').hasAttribute('placeholder')).toBe(
      false,
    );
  });

  it('attaches inputRef to the input element', () => {
    const inputRef = createRef<HTMLInputElement>();
    render(
      <TextField
        label="Nome"
        value=""
        onChange={() => {}}
        inputRef={inputRef}
      />,
    );

    expect(inputRef.current).toBe(screen.getByLabelText('Nome'));
  });

  it('does not block submit of a noValidate form with an invalid e-mail', () => {
    const onSubmit = vi.fn<() => void>();
    render(
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <TextField
          label="E-mail"
          type="email"
          value="ana@"
          onChange={() => {}}
        />
        <button type="submit">Entrar</button>
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('E-mail').hasAttribute('aria-invalid')).toBe(
      false,
    );
  });

  it('keeps the error out of native constraint validation', () => {
    render(
      <TextField
        label="E-mail"
        value=""
        onChange={() => {}}
        error="E-mail inválido"
      />,
    );

    expect(
      screen.getByLabelText<HTMLInputElement>('E-mail').validity.valid,
    ).toBe(true);
  });
});
