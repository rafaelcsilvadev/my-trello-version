import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '@/shared/ui/button';

describe('Button', () => {
  afterEach(() => {
    cleanup();
  });

  it('uses its children as the accessible name', () => {
    render(<Button>Criar conta</Button>);

    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeTruthy();
  });

  it('calls onPress when clicked', () => {
    const onPress = vi.fn<() => void>();
    render(<Button onPress={onPress}>Sair</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(onPress).toHaveBeenCalledOnce();
  });

  it('submits its form when type is submit', () => {
    const onSubmit = vi.fn<() => void>();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Button type="submit">Entrar</Button>
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('renders the native disabled attribute and ignores presses when isDisabled', () => {
    const onPress = vi.fn<() => void>();
    render(
      <Button isDisabled onPress={onPress}>
        Entrando…
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Entrando…' });
    fireEvent.click(button);

    expect(button.hasAttribute('disabled')).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders as primary md by default', () => {
    render(<Button>Entrar</Button>);

    const { classList } = screen.getByRole('button');
    expect(classList.contains('bg-brand')).toBe(true);
    expect(classList.contains('h-(--control-md)')).toBe(true);
    expect(classList.contains('w-full')).toBe(false);
  });

  it('applies the secondary variant, lg size and fullWidth classes', () => {
    render(
      <Button variant="secondary" size="lg" fullWidth>
        Cancelar
      </Button>,
    );

    const { classList } = screen.getByRole('button');
    expect(classList.contains('bg-surface-card')).toBe(true);
    expect(classList.contains('bg-brand')).toBe(false);
    expect(classList.contains('h-(--control-lg)')).toBe(true);
    expect(classList.contains('h-(--control-md)')).toBe(false);
    expect(classList.contains('w-full')).toBe(true);
  });

  it('applies the danger variant classes', () => {
    render(<Button variant="danger">Excluir definitivamente</Button>);

    const { classList } = screen.getByRole('button');
    expect(classList.contains('bg-danger')).toBe(true);
    expect(classList.contains('text-(--text-on-dark)')).toBe(true);
    expect(classList.contains('hover:bg-red-600')).toBe(true);
    expect(classList.contains('active:bg-red-700')).toBe(true);
    expect(classList.contains('bg-brand')).toBe(false);
    expect(classList.contains('bg-surface-card')).toBe(false);
  });

  it('applies the ghost variant classes', () => {
    render(<Button variant="ghost">Adicionar tarefa</Button>);

    const { classList } = screen.getByRole('button');
    expect(classList.contains('bg-transparent')).toBe(true);
    expect(classList.contains('text-text-secondary')).toBe(true);
    expect(classList.contains('hover:bg-neutral-100')).toBe(true);
    expect(classList.contains('hover:text-text-primary')).toBe(true);
    expect(classList.contains('bg-brand')).toBe(false);
    expect(classList.contains('shadow-xs')).toBe(false);
  });

  it('applies the soft variant classes', () => {
    render(<Button variant="soft">Etiquetas · 2</Button>);

    const { classList } = screen.getByRole('button');
    expect(classList.contains('bg-(--purple-50)')).toBe(true);
    expect(classList.contains('text-purple-700')).toBe(true);
    expect(classList.contains('hover:bg-(--purple-100)')).toBe(true);
    expect(classList.contains('active:bg-purple-200')).toBe(true);
    expect(classList.contains('border-transparent')).toBe(true);
    expect(classList.contains('bg-brand')).toBe(false);
    expect(classList.contains('bg-transparent')).toBe(false);
  });

  it('applies the sm size classes', () => {
    render(<Button size="sm">Restaurar</Button>);

    const { classList } = screen.getByRole('button');
    expect(classList.contains('h-(--control-sm)')).toBe(true);
    expect(classList.contains('px-2.5')).toBe(true);
    expect(classList.contains('text-sm')).toBe(true);
    expect(classList.contains('h-(--control-md)')).toBe(false);
  });
});
