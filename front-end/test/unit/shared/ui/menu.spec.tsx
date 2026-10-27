import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Archive, Pencil, Tag, Trash2 } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionMenu } from '@/shared/ui/menu';

function buildItems() {
  return [
    {
      id: 'rename',
      label: 'Renomear',
      icon: Pencil,
      onAction: vi.fn<() => void>(),
    },
    {
      id: 'archive',
      label: 'Arquivar',
      icon: Archive,
      onAction: vi.fn<() => void>(),
    },
    {
      id: 'delete',
      label: 'Excluir',
      icon: Trash2,
      tone: 'danger' as const,
      onAction: vi.fn<() => void>(),
    },
  ];
}

describe('ActionMenu', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a button named by its label with the menu closed', () => {
    render(<ActionMenu label="Ações do quadro" items={buildItems()} />);

    expect(
      screen.getByRole('button', { name: 'Ações do quadro' }),
    ).toBeTruthy();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens a menu with one menuitem per item in order on click', () => {
    render(<ActionMenu label="Ações do quadro" items={buildItems()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ações do quadro' }));

    const menu = screen.getByRole('menu', { name: 'Ações do quadro' });
    const names = Array.from(menu.querySelectorAll('[role="menuitem"]')).map(
      (item) => item.textContent,
    );
    expect(names).toEqual(['Renomear', 'Arquivar', 'Excluir']);
  });

  it('calls the chosen item onAction once and closes the menu', () => {
    const items = buildItems();
    render(<ActionMenu label="Ações do quadro" items={items} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ações do quadro' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Arquivar' }));

    expect(items[1].onAction).toHaveBeenCalledTimes(1);
    expect(items[0].onAction).not.toHaveBeenCalled();
    expect(items[2].onAction).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('paints danger items in the danger tone only', () => {
    render(<ActionMenu label="Ações do quadro" items={buildItems()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ações do quadro' }));

    expect(
      screen.getByRole('menuitem', { name: 'Excluir' }).className,
    ).toContain('text-red-600');
    expect(
      screen.getByRole('menuitem', { name: 'Renomear' }).className,
    ).not.toContain('text-red-600');
  });

  it('renders an href item as a link to that href', () => {
    render(
      <ActionMenu
        label="Ações do quadro"
        items={[
          { id: 'labels', label: 'Etiquetas', icon: Tag, href: '/b/1/labels' },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ações do quadro' }));

    const item = screen.getByRole('menuitem', { name: 'Etiquetas' });
    expect(item.tagName).toBe('A');
    expect(item.getAttribute('href')).toBe('/b/1/labels');
  });

  it('disables the button and keeps the menu closed when isDisabled', () => {
    render(
      <ActionMenu label="Ações do quadro" items={buildItems()} isDisabled />,
    );

    const button = screen.getByRole('button', { name: 'Ações do quadro' });
    fireEvent.click(button);

    expect(button.hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
