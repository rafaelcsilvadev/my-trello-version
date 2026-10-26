import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Dialog } from '@/shared/ui/dialog';

describe('Dialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nothing when closed', () => {
    render(
      <Dialog isOpen={false} onOpenChange={() => {}} title="Criar quadro">
        Corpo
      </Dialog>,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Corpo')).toBeNull();
  });

  it('renders a modal dialog named by its title with the body', () => {
    render(
      <Dialog isOpen onOpenChange={() => {}} title="Criar quadro">
        Corpo
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Criar quadro' });
    expect(dialog.textContent).toContain('Corpo');
    expect(screen.getByRole('heading', { name: 'Criar quadro' }).tagName).toBe(
      'H2',
    );
  });

  it('renders an alertdialog when asked', () => {
    render(
      <Dialog
        isOpen
        onOpenChange={() => {}}
        title="Excluir o quadro?"
        role="alertdialog"
      >
        Corpo
      </Dialog>,
    );

    expect(
      screen.getByRole('alertdialog', { name: 'Excluir o quadro?' }),
    ).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the footer when given', () => {
    render(
      <Dialog
        isOpen
        onOpenChange={() => {}}
        title="Criar quadro"
        footer={<button type="button">Cancelar</button>}
      >
        Corpo
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Criar quadro' });
    expect(
      dialog.contains(screen.getByRole('button', { name: 'Cancelar' })),
    ).toBe(true);
  });

  it('calls onOpenChange(false) when Escape is pressed', () => {
    const onOpenChange = vi.fn<(isOpen: boolean) => void>();
    render(
      <Dialog isOpen onOpenChange={onOpenChange} title="Criar quadro">
        Corpo
      </Dialog>,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange(false) when the overlay is clicked', () => {
    const onOpenChange = vi.fn<(isOpen: boolean) => void>();
    render(
      <Dialog isOpen onOpenChange={onOpenChange} title="Criar quadro">
        Corpo
      </Dialog>,
    );

    // The overlay covers the page, so a press outside the modal lands on it.
    fireEvent.pointerDown(document.body, { button: 0 });
    fireEvent.click(document.body, { button: 0 });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('moves focus into the dialog when it opens', async () => {
    render(
      <Dialog isOpen onOpenChange={() => {}} title="Criar quadro">
        <input aria-label="Nome" />
      </Dialog>,
    );

    // React Aria defers the focus after a virtual click, so wait for it.
    await waitFor(() => {
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(
        true,
      );
    });
  });
});
