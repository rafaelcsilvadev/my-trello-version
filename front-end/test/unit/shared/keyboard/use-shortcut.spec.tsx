import { cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useShortcut } from '@/shared/keyboard/use-shortcut';

function renderShortcut(enabled = true) {
  const handler = vi.fn<() => void>();
  const view = renderHook(
    ({ enabled }) => useShortcut('n', handler, { enabled }),
    { initialProps: { enabled } },
  );
  return { handler, ...view };
}

function mount(html: string) {
  document.body.insertAdjacentHTML('beforeend', html);
  return document.body.lastElementChild as HTMLElement;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('useShortcut', () => {
  it('calls the handler when the key is pressed', () => {
    const { handler } = renderShortcut();

    fireEvent.keyDown(document.body, { key: 'n' });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('prevents the default action of a handled key', () => {
    renderShortcut();

    const handled = fireEvent.keyDown(document.body, { key: 'n' });

    expect(handled).toBe(false);
  });

  it('ignores other keys', () => {
    const { handler } = renderShortcut();

    fireEvent.keyDown(document.body, { key: 'm' });

    expect(handler).not.toHaveBeenCalled();
  });

  it.each(['ctrlKey', 'metaKey', 'altKey'])(
    'ignores the key while %s is held',
    (modifier) => {
      const { handler } = renderShortcut();

      const handled = fireEvent.keyDown(document.body, {
        key: 'n',
        [modifier]: true,
      });

      expect(handler).not.toHaveBeenCalled();
      expect(handled).toBe(true);
    },
  );

  it.each([
    ['input', '<input />'],
    ['textarea', '<textarea></textarea>'],
    ['select', '<select><option>a</option></select>'],
    ['contenteditable', '<div contenteditable="true"><span>text</span></div>'],
  ])('ignores the key while focus is in a %s', (_, html) => {
    const { handler } = renderShortcut();
    const field = mount(html);
    const target = field.querySelector('span') ?? field;

    fireEvent.keyDown(target, { key: 'n' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores the key while a modal is open', () => {
    const { handler } = renderShortcut();
    mount('<div role="dialog" aria-modal="true"><button>ok</button></div>');

    fireEvent.keyDown(document.body, { key: 'n' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('works again once the modal closes', () => {
    const { handler } = renderShortcut();
    const modal = mount('<div aria-modal="true"></div>');
    modal.remove();

    fireEvent.keyDown(document.body, { key: 'n' });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores the key while disabled and resumes when enabled', () => {
    const { handler, rerender } = renderShortcut(false);

    fireEvent.keyDown(document.body, { key: 'n' });
    expect(handler).not.toHaveBeenCalled();

    rerender({ enabled: true });
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls the latest handler after a re-render', () => {
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();
    const { rerender } = renderHook(
      ({ handler }) => useShortcut('n', handler, { enabled: true }),
      { initialProps: { handler: first } },
    );

    rerender({ handler: second });
    fireEvent.keyDown(document.body, { key: 'n' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const { handler, unmount } = renderShortcut();

    unmount();
    fireEvent.keyDown(document.body, { key: 'n' });

    expect(handler).not.toHaveBeenCalled();
  });
});
