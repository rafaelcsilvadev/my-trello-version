import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardDetailChecklist } from '@/features/board/components/card-detail-checklist';
import {
  checklistProgress,
  type ItemMoveSession,
  previewItems,
} from '@/features/board/model/checklist';
import type { MoveInput } from '@/features/board/model/move';
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
      move: {
        preview: previewItems(items, null),
        bannerText: null,
        announcement: '',
        keyboardItemId: null,
      },
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
      move: {
        canDrag: vi.fn<(id: string) => boolean>(() => true),
        start: vi.fn<(id: string, input: MoveInput) => void>(),
        step: vi.fn<(key: 'ArrowUp' | 'ArrowDown') => void>(),
        hover: vi.fn<(index: number) => void>(),
        drop: vi.fn<() => void>(),
        cancel: vi.fn<() => void>(),
      },
    },
    isDisabled,
  };
  const i18n = createI18n('pt-BR');
  const view = (next: Props) => (
    <I18nextProvider i18n={i18n}>
      <CardDetailChecklist {...next} />
    </I18nextProvider>
  );
  const { rerender } = render(view(props));
  return {
    props,
    rerender: (state: Partial<Props['state']>) =>
      rerender(view({ ...props, state: { ...props.state, ...state } })),
  };
}

// The move state a session over `threeItems` renders.
function moveState(
  session: ItemMoveSession | null,
  extra: Partial<Props['state']['move']> = {},
): Props['state']['move'] {
  return {
    preview: previewItems(threeItems, session),
    bannerText: null,
    announcement: '',
    keyboardItemId: session?.input === 'keyboard' ? session.id : null,
    ...extra,
  };
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
const grip = (text: string) =>
  screen.queryByRole<HTMLButtonElement>('button', {
    name: `Reordenar o item ${text}`,
  });
const rowOf = (text: string) => grip(text)!.parentElement!;
const placeholder = () => screen.queryByTestId('checklist-drop-placeholder');
const endZone = () => screen.queryByTestId('checklist-drop-end');

// jsdom has no DataTransfer.
function dataTransferStub() {
  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    setData: vi.fn<(format: string, data: string) => void>(),
    getData: vi.fn<(format: string) => string>(() => ''),
  };
}

// jsdom has no DragEvent, so the plain event it builds drops `clientY`.
function dragOver(target: HTMLElement, clientY = 0) {
  const event = createEvent.dragOver(target, {
    dataTransfer: dataTransferStub(),
  });
  Object.defineProperty(event, 'clientY', { value: clientY });
  fireEvent(target, event);
  return event;
}

// A 40 px row from 100 to 140, so the middle sits at 120.
function stubRect(element: HTMLElement) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    top: 100,
    height: 40,
  } as DOMRect);
}

const addField = () =>
  screen.queryByRole<HTMLInputElement>('textbox', {
    name: 'Adicionar item e apertar Enter',
  });

describe('CardDetailChecklist', () => {
  it('shows the heading and the items in the given order (FCL-01)', () => {
    renderChecklist();

    expect(screen.getByRole('heading', { name: 'Checklist' })).toBeTruthy();
    expect(
      screen
        .getAllByRole<HTMLInputElement>('textbox', { name: /^Editar item/ })
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

  it('sends what is typed in the add field to the view model', async () => {
    const { props } = renderChecklist();

    await userEvent.setup().type(addField()!, 'N');

    expect(addField()?.placeholder).toBe('Adicionar item e apertar Enter');
    expect(props.actions.setNewText).toHaveBeenCalledWith('N');
  });

  it('adds on Enter and keeps focus in the add field (FCL-10, FCL-12)', async () => {
    const { props } = renderChecklist({ state: { newText: 'Novo item' } });
    const user = userEvent.setup();

    await user.click(addField()!);
    await user.keyboard('{Enter}');

    expect(props.actions.add).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(addField());
  });

  it('shows the add field error in an alert and marks the field invalid (FCL-13, FCL-23)', () => {
    renderChecklist({
      state: { error: { target: 'new', code: 'checklistItemRequired' } },
    });

    expect(screen.getByRole('alert').textContent).toBe('Escreva o item');
    expect(addField()?.getAttribute('aria-invalid')).toBe('true');
  });

  it('shows an item error in the same alert without marking the add field (FCL-23)', () => {
    renderChecklist({
      state: { error: { target: 'i3', code: 'checklistItemTooLong' } },
    });

    expect(screen.getByRole('alert').textContent).toBe(
      'Use até 200 caracteres',
    );
    expect(addField()?.getAttribute('aria-invalid')).toBeNull();
  });

  it('shows no alert without an error', () => {
    renderChecklist();

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('moves focus to the add field after a delete (FCL-25)', async () => {
    const { props } = renderChecklist();

    await userEvent.setup().click(deleteButton('Publicar')!);

    expect(props.actions.remove).toHaveBeenCalledWith('i3');
    expect(document.activeElement).toBe(addField());
  });

  it('shows no add field when read-only (FCL-32)', () => {
    renderChecklist({ isDisabled: true });

    expect(addField()).toBeNull();
  });
  describe('move', () => {
    const mouse = (id: string, target: number | null): ItemMoveSession => ({
      id,
      input: 'mouse',
      origin: threeItems.findIndex((item) => item.id === id),
      target,
    });
    const keyboard = (id: string, target: number | null): ItemMoveSession => ({
      ...mouse(id, target),
      input: 'keyboard',
    });

    it('shows a grip on every row (FCLD-01)', () => {
      renderChecklist();

      for (const item of threeItems) expect(grip(item.text)).not.toBeNull();
    });

    // The view model types the banner as its translated key.
    const bannerText = 'Movendo' as Props['state']['move']['bannerText'];

    it('shows the banner between the progress bar and the list only with a text (FCLD-08)', () => {
      const { rerender } = renderChecklist();
      expect(screen.queryByText('Movendo')).toBeNull();

      rerender({ move: moveState(null, { bannerText }) });

      const banner = screen.getByText('Movendo');
      expect(
        progressBar()!.compareDocumentPosition(banner) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        banner.compareDocumentPosition(checkbox('Escrever testes')) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('announces in an assertive output inside the section (FCLD-17)', () => {
      renderChecklist({
        state: { move: moveState(null, { announcement: 'Item solto' }) },
      });

      const region = screen.getByRole('status');
      expect(region.tagName).toBe('OUTPUT');
      expect(region.getAttribute('aria-live')).toBe('assertive');
      expect(region.className).toContain('sr-only');
      expect(region.textContent).toBe('Item solto');
      expect(region.closest('section')).not.toBeNull();
    });

    it('keeps the live region mounted while the items load (FCLD-17)', () => {
      renderChecklist({ state: { status: 'loading' } });

      expect(screen.getByRole('status').textContent).toBe('');
    });

    it('renders the rows from the keyboard preview with the picked row lifted (FCLD-08, FCLD-09)', () => {
      renderChecklist({ state: { move: moveState(keyboard('i1', 2)) } });

      expect(
        screen.getAllByRole('button', { name: /^Reordenar o item/ }),
      ).toEqual([
        grip('Revisar PR'),
        grip('Publicar'),
        grip('Escrever testes'),
      ]);
      expect(rowOf('Escrever testes').className).toContain('bg-brand-soft');
      expect(rowOf('Publicar').className).not.toContain('bg-brand-soft');
    });

    it('marks the dragged row as the source (FCLD-04)', () => {
      renderChecklist({ state: { move: moveState(mouse('i2', null)) } });

      expect(rowOf('Revisar PR').className).toContain('border-dashed');
      expect(rowOf('Publicar').className).not.toContain('border-dashed');
      expect(placeholder()).toBeNull();
    });

    it('renders the dashed placeholder at the index among the other rows (FCLD-04)', () => {
      const { rerender } = renderChecklist({
        state: { move: moveState(mouse('i3', 0)) },
      });

      expect(placeholder()!.className).toContain('border-dashed');
      expect(placeholder()!.nextElementSibling).toBe(rowOf('Escrever testes'));

      // Past the last of the other rows, after the source row.
      rerender({ move: moveState(mouse('i1', 2)) });

      expect(placeholder()!.previousElementSibling).toBe(rowOf('Publicar'));
    });

    it('maps a hover over a row to its index among the other rows (FCLD-04)', () => {
      const { props } = renderChecklist({
        state: { move: moveState(mouse('i1', null)) },
      });
      stubRect(rowOf('Publicar'));

      dragOver(rowOf('Publicar'), 110);
      dragOver(rowOf('Publicar'), 130);

      expect(vi.mocked(props.actions.move.hover).mock.calls).toEqual([
        [1],
        [2],
      ]);
    });

    it('hovers the end of the list from the end zone and drops there', () => {
      const { props } = renderChecklist({
        state: { move: moveState(mouse('i1', null)) },
      });

      const event = dragOver(endZone()!);
      fireEvent.drop(endZone()!, { dataTransfer: dataTransferStub() });

      expect(event.defaultPrevented).toBe(true);
      // Two other rows, so the end is index 2.
      expect(props.actions.move.hover).toHaveBeenCalledExactlyOnceWith(2);
      expect(props.actions.move.drop).toHaveBeenCalledOnce();
    });

    it('shows no end zone without a mouse drag', () => {
      renderChecklist();

      expect(endZone()).toBeNull();
    });

    it('accepts a drop on the placeholder', () => {
      const { props } = renderChecklist({
        state: { move: moveState(mouse('i1', 2)) },
      });

      const event = dragOver(placeholder()!);
      fireEvent.drop(placeholder()!, { dataTransfer: dataTransferStub() });

      expect(event.defaultPrevented).toBe(true);
      expect(props.actions.move.hover).not.toHaveBeenCalled();
      expect(props.actions.move.drop).toHaveBeenCalledOnce();
    });

    it('starts a mouse drag with the row id and cancels it on drag end (FCLD-06)', () => {
      const { props } = renderChecklist();

      fireEvent.pointerDown(grip('Revisar PR')!);
      fireEvent.dragStart(rowOf('Revisar PR'), {
        dataTransfer: dataTransferStub(),
      });
      fireEvent.drop(rowOf('Publicar'), { dataTransfer: dataTransferStub() });
      fireEvent.dragEnd(rowOf('Revisar PR'), {
        dataTransfer: dataTransferStub(),
      });

      expect(props.actions.move.start).toHaveBeenCalledExactlyOnceWith(
        'i2',
        'mouse',
      );
      expect(props.actions.move.drop).toHaveBeenCalledOnce();
      expect(props.actions.move.cancel).toHaveBeenCalledOnce();
    });

    it('starts a keyboard move with Space on the row grip (FCLD-08)', async () => {
      const { props } = renderChecklist();

      grip('Publicar')!.focus();
      await userEvent.keyboard(' ');

      expect(props.actions.move.start).toHaveBeenCalledExactlyOnceWith(
        'i3',
        'keyboard',
      );
    });

    it('routes the picked grip keys to step, drop and cancel (FCLD-09, FCLD-11, FCLD-14)', async () => {
      const { props } = renderChecklist({
        state: { move: moveState(keyboard('i2', null)) },
      });

      grip('Revisar PR')!.focus();
      await userEvent.keyboard('{ArrowUp}{ArrowDown}{Enter} {Escape}');

      expect(vi.mocked(props.actions.move.step).mock.calls).toEqual([
        ['ArrowUp'],
        ['ArrowDown'],
      ]);
      expect(props.actions.move.drop).toHaveBeenCalledTimes(2);
      expect(props.actions.move.cancel).toHaveBeenCalledOnce();
    });

    it('disables the grip of a row that cannot move (FCLD-22)', () => {
      const { props, rerender } = renderChecklist();

      vi.mocked(props.actions.move.canDrag).mockImplementation(
        (id) => id !== 'i2',
      );
      rerender({});

      expect(grip('Revisar PR')!.disabled).toBe(true);
      expect(grip('Publicar')!.disabled).toBe(false);
    });

    // jsdom keeps focus on a moved node; a browser can drop it to `body`.
    const loseFocus = () => (document.activeElement as HTMLElement).blur();

    it('refocuses the picked grip after each step and after the drop (FCLD-15)', () => {
      const { rerender } = renderChecklist({
        state: { move: moveState(keyboard('i1', null)) },
      });
      grip('Escrever testes')!.focus();

      loseFocus();
      rerender({ move: moveState(keyboard('i1', 1)) });
      expect(document.activeElement).toBe(grip('Escrever testes'));

      loseFocus();
      rerender({ move: moveState(keyboard('i1', 2)) });
      expect(document.activeElement).toBe(grip('Escrever testes'));

      // The saved order arrives with the drop.
      const dropped = previewItems(threeItems, keyboard('i1', 2)).items;
      loseFocus();
      rerender({
        items: dropped,
        move: { ...moveState(null), preview: previewItems(dropped, null) },
      });
      expect(document.activeElement).toBe(grip('Escrever testes'));
    });

    it('leaves focus the user moved elsewhere', () => {
      const { rerender } = renderChecklist({
        state: { move: moveState(keyboard('i1', 1)) },
      });
      addField()!.focus();

      rerender({ move: moveState(null) });
      loseFocus();
      rerender({ move: moveState(null) });

      expect(document.activeElement).toBe(document.body);
    });

    it('shows no grip when read-only (FCLD-24)', () => {
      renderChecklist({ isDisabled: true });

      expect(screen.queryAllByRole('button', { name: /^Reordenar/ })).toEqual(
        [],
      );
    });

    it('shows no grip while the items load or fail to load (FCLD-25)', () => {
      renderChecklist({ state: { status: 'loading' } });
      expect(screen.queryAllByRole('button', { name: /^Reordenar/ })).toEqual(
        [],
      );

      cleanup();
      renderChecklist({ state: { status: 'error' } });
      expect(screen.queryAllByRole('button', { name: /^Reordenar/ })).toEqual(
        [],
      );
    });
  });
});
