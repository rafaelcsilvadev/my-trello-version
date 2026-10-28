import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MoveToDialog } from '@/features/board/components/move-to-dialog';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

import { cardFixture, listFixture } from '../../../../support/fixtures/board';

const lists = [
  listFixture('list-1', { title: 'A fazer' }),
  listFixture('list-2', { title: 'Fazendo' }),
  listFixture('list-3', { title: 'Feito' }),
];
const card = cardFixture('card-1', 'list-2', { title: 'Login' });

function renderDialog(language: Language = 'pt-BR') {
  const onChoose = vi.fn<(listId: string) => void>();
  const onClose = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <MoveToDialog
        card={card}
        lists={lists}
        onChoose={onChoose}
        onClose={onClose}
      />
    </I18nextProvider>,
  );
  return { onChoose, onClose };
}

function options() {
  return within(screen.getByRole('list')).getAllByRole('button');
}

describe('MoveToDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      title: 'Mover para…',
      current: 'Atual',
      close: 'Fechar',
    },
    {
      language: 'en' as const,
      title: 'Move to…',
      current: 'Current',
      close: 'Close',
    },
  ])(
    'is named after the action and described by the card title ($language)',
    ({ language, title, current, close }) => {
      renderDialog(language);

      expect(
        screen.getByRole('dialog', { name: title, description: '“Login”' }),
      ).toBeTruthy();
      expect(screen.getByRole('list', { name: title })).toBeTruthy();
      expect(screen.getByText(current)).toBeTruthy();
      expect(screen.getByRole('button', { name: close })).toBeTruthy();
    },
  );

  it('lists one option per active column in board order', () => {
    renderDialog();

    expect(options().map((option) => option.textContent?.trim())).toEqual([
      'A fazer',
      'Fazendo Atual',
      'Feito',
    ]);
  });

  it('marks only the current column as current, with Atual and a check', () => {
    renderDialog();

    const [todo, doing, done] = options();
    expect(doing?.getAttribute('aria-current')).toBe('true');
    expect(todo?.hasAttribute('aria-current')).toBe(false);
    expect(done?.hasAttribute('aria-current')).toBe(false);
    expect(screen.getAllByText('Atual')).toHaveLength(1);
    expect(doing?.querySelector('svg.lucide-check')).toBeTruthy();
  });

  it('calls back with the chosen column id', () => {
    const { onChoose, onClose } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Feito' }));

    expect(onChoose).toHaveBeenCalledExactlyOnceWith('list-3');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls back with the current column id too, leaving the no-op to the caller', () => {
    const { onChoose } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Fazendo Atual' }));

    expect(onChoose).toHaveBeenCalledExactlyOnceWith('list-2');
  });

  it('calls onClose without choosing when Esc is pressed', () => {
    const { onChoose, onClose } = renderDialog();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('calls onClose without choosing when Fechar is pressed', () => {
    const { onChoose, onClose } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('lists the only column as current when the board has one', () => {
    const onChoose = vi.fn<(listId: string) => void>();
    render(
      <I18nextProvider i18n={createI18n('pt-BR')}>
        <MoveToDialog
          card={card}
          lists={[lists[1]!]}
          onChoose={onChoose}
          onClose={() => {}}
        />
      </I18nextProvider>,
    );

    expect(options()).toHaveLength(1);
    expect(options()[0]?.getAttribute('aria-current')).toBe('true');
  });
});
