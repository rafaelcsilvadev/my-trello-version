import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextAreaField } from '@/shared/ui/text-area-field';

function describedByText(input: HTMLElement): string {
  return (input.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent)
    .join(' | ');
}

describe('TextAreaField', () => {
  afterEach(() => {
    cleanup();
  });

  it('names the multi-line input with its label', () => {
    render(<TextAreaField label="Descrição" value="" onChange={() => {}} />);

    const input = screen.getByRole('textbox', { name: 'Descrição' });
    expect(input.tagName).toBe('TEXTAREA');
  });

  it('shows the value and reports typed text through onChange', () => {
    const onChange = vi.fn<(value: string) => void>();
    render(
      <TextAreaField label="Descrição" value="Metas" onChange={onChange} />,
    );

    const input = screen.getByRole<HTMLTextAreaElement>('textbox', {
      name: 'Descrição',
    });
    fireEvent.change(input, { target: { value: 'Metas\ndo Q3' } });

    expect(input.value).toBe('Metas');
    expect(onChange).toHaveBeenCalledWith('Metas\ndo Q3');
  });

  it('shows the counter referenced by aria-describedby when given', () => {
    render(
      <TextAreaField
        label="Descrição"
        value=""
        onChange={() => {}}
        counter="0 / 1000"
      />,
    );

    expect(describedByText(screen.getByLabelText('Descrição'))).toBe(
      '0 / 1000',
    );
  });

  it('marks the input invalid and shows the error referenced by aria-describedby', () => {
    render(
      <TextAreaField
        label="Descrição"
        value=""
        onChange={() => {}}
        counter="1001 / 1000"
        error="A descrição deve ter no máximo 1000 caracteres"
      />,
    );

    const input = screen.getByLabelText('Descrição');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(
      screen.getByText('A descrição deve ter no máximo 1000 caracteres'),
    ).toBeTruthy();
    expect(describedByText(input)).toContain(
      'A descrição deve ter no máximo 1000 caracteres',
    );
    expect(describedByText(input)).toContain('1001 / 1000');
  });

  it('has no aria-invalid, counter or error text by default', () => {
    render(<TextAreaField label="Descrição" value="" onChange={() => {}} />);

    const input = screen.getByLabelText('Descrição');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('shows the placeholder on the input when given', () => {
    render(
      <TextAreaField
        label="Descrição"
        value=""
        onChange={() => {}}
        placeholder="Sobre o que é este quadro?"
      />,
    );

    expect(screen.getByLabelText('Descrição').getAttribute('placeholder')).toBe(
      'Sobre o que é este quadro?',
    );
  });

  it('disables the textarea when isDisabled is set', () => {
    render(
      <TextAreaField
        label="Descrição"
        value=""
        onChange={() => {}}
        isDisabled
      />,
    );

    expect(
      screen.getByLabelText<HTMLTextAreaElement>('Descrição').disabled,
    ).toBe(true);
  });

  it('attaches inputRef to the textarea element', () => {
    const inputRef = createRef<HTMLTextAreaElement>();
    render(
      <TextAreaField
        label="Descrição"
        value=""
        onChange={() => {}}
        inputRef={inputRef}
      />,
    );

    expect(inputRef.current).toBe(screen.getByLabelText('Descrição'));
  });
});
