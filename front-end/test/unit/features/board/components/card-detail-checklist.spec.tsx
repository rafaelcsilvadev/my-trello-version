import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardDetailChecklist } from '@/features/board/components/card-detail-checklist';
import { checklistProgress } from '@/features/board/model/checklist';
import type { ChecklistItem } from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';

import { checklistItem } from '../../../../support/fixtures/board';

afterEach(cleanup);

type Props = ComponentProps<typeof CardDetailChecklist>;

const threeItems = [
  checklistItem('i1', 'c1', { text: 'Escrever testes', done: true }),
  checklistItem('i2', 'c1', { text: 'Revisar PR', done: true, position: 1 }),
  checklistItem('i3', 'c1', { text: 'Publicar', position: 2 }),
];

function renderChecklist({
  items = threeItems,
  state = {},
  isDisabled = false,
}: {
  items?: ChecklistItem[];
  state?: Partial<Props['state']>;
  isDisabled?: boolean;
} = {}) {
  const props: Props = {
    state: {
      status: 'ready',
      items,
      progress: checklistProgress(items),
      drafts: {},
      newText: '',
      isCreating: false,
      error: null,
      pendingIds: new Set<string>(),
      ...state,
    },
    actions: {
      retryLoad: vi.fn<() => undefined>(),
      setNewText: vi.fn<(text: string) => void>(),
      add: vi.fn<() => void>(),
      toggle: vi.fn<(id: string) => void>(),
      setDraft: vi.fn<(id: string, text: string) => void>(),
      submitDraft: vi.fn<(id: string) => void>(),
      cancelDraft: vi.fn<(id: string) => void>(),
      remove: vi.fn<(id: string) => void>(),
    },
    isDisabled,
  };
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <CardDetailChecklist {...props} />
    </I18nextProvider>,
  );
  return { props };
}

const progressBar = () =>
  screen.queryByRole('progressbar', { name: 'Checklist' });
const barFill = () => progressBar()?.firstElementChild as HTMLElement;
const count = (text: string) => screen.queryByText(text);
const checkbox = (name: string) =>
  screen.getByRole<HTMLInputElement>('checkbox', { name });
const textbox = (text: string) =>
  screen.getByRole<HTMLInputElement>('textbox', {
    name: `Editar item “${text}”`,
  });
const deleteButton = (text: string) =>
  screen.queryByRole<HTMLButtonElement>('button', {
    name: `Excluir item “${text}”`,
  });

describe('CardDetailChecklist', () => {
  it('shows the heading and the items in the given order (FCL-01)', () => {
    renderChecklist();

    expect(screen.getByRole('heading', { name: 'Checklist' })).toBeTruthy();
    expect(
      screen
        .getAllByRole<HTMLInputElement>('textbox')
        .map((field) => field.value),
    ).toEqual(['Escrever testes', 'Revisar PR', 'Publicar']);
  });

  it('shows the count and a brand progress bar at the rounded percent (FCL-05)', () => {
    renderChecklist();

    expect(count('2/3')?.className).toContain('text-text-secondary');
    expect(progressBar()?.getAttribute('aria-valuetext')).toBe('2/3');
    expect(barFill().style.width).toBe('67%');
    expect(barFill().className).toContain('bg-brand');
  });

  it('shows the count and the bar in green when every item is done (FCL-06)', () => {
    renderChecklist({
      items: threeItems.map((item) => ({ ...item, done: true })),
    });

    expect(count('3/3')?.className).toContain('text-green-700');
    expect(barFill().style.width).toBe('100%');
    expect(barFill().className).toContain('bg-green-500');
  });

  it('shows neither the count nor the bar without items (FCL-07)', () => {
    renderChecklist({ items: [] });

    expect(screen.getByRole('heading', { name: 'Checklist' })).toBeTruthy();
    expect(count('0/0')).toBeNull();
    expect(progressBar()).toBeNull();
  });

  it('shows a skeleton and no list while the items load (FCL-02)', () => {
    renderChecklist({ items: [], state: { status: 'loading' } });

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(progressBar()).toBeNull();
  });

  it('shows the load error whose retry loads the items again (FCL-03)', async () => {
    const { props } = renderChecklist({
      items: [],
      state: { status: 'error' },
    });

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Não foi possível carregar')).toBeTruthy();
    await userEvent
      .setup()
      .click(within(alert).getByRole('button', { name: 'Tentar novamente' }));

    expect(props.actions.retryLoad).toHaveBeenCalledOnce();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('still shows the count and the bar when read-only (FCL-33)', () => {
    renderChecklist({ isDisabled: true });

    expect(count('2/3')).not.toBeNull();
    expect(progressBar()?.getAttribute('aria-valuetext')).toBe('2/3');
  });

  it('gives each row its draft, invalid and pending state (L-001)', () => {
    renderChecklist({
      state: {
        drafts: { i3: 'Publicar hoje' },
        error: { target: 'i3', code: 'checklistItemRequired' },
        pendingIds: new Set(['i2']),
      },
    });

    expect(textbox('Publicar').value).toBe('Publicar hoje');
    expect(textbox('Publicar').getAttribute('aria-invalid')).toBe('true');
    expect(textbox('Escrever testes').value).toBe('Escrever testes');
    expect(textbox('Escrever testes').getAttribute('aria-invalid')).toBeNull();
    expect(checkbox('Revisar PR').disabled).toBe(true);
    expect(deleteButton('Revisar PR')?.disabled).toBe(true);
    expect(checkbox('Publicar').disabled).toBe(false);
    expect(deleteButton('Publicar')?.disabled).toBe(false);
  });

  it('does not mark a row invalid for the add field error', () => {
    renderChecklist({
      state: { error: { target: 'new', code: 'checklistItemRequired' } },
    });

    for (const item of threeItems) {
      expect(textbox(item.text).getAttribute('aria-invalid')).toBeNull();
    }
  });

  it('locks every row when read-only (FCL-32)', () => {
    renderChecklist({ isDisabled: true });

    for (const item of threeItems) {
      expect(checkbox(item.text).disabled).toBe(true);
      expect(textbox(item.text).disabled).toBe(true);
      expect(deleteButton(item.text)).toBeNull();
    }
  });

  it('routes each row action with its item id', async () => {
    const { props } = renderChecklist();
    const user = userEvent.setup();

    await user.click(checkbox('Publicar'));
    expect(props.actions.toggle).toHaveBeenCalledWith('i3');

    await user.type(textbox('Revisar PR'), '!');
    expect(props.actions.setDraft).toHaveBeenLastCalledWith(
      'i2',
      'Revisar PR!',
    );

    await user.keyboard('{Enter}');
    expect(props.actions.submitDraft).toHaveBeenCalledWith('i2');

    await user.keyboard('{Escape}');
    expect(props.actions.cancelDraft).toHaveBeenCalledWith('i2');

    await user.click(deleteButton('Escrever testes')!);
    expect(props.actions.remove).toHaveBeenCalledWith('i1');
  });
});
