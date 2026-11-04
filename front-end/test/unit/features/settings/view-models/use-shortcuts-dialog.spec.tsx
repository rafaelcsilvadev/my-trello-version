import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useShortcutsDialog } from '@/features/settings/view-models/use-shortcuts-dialog';

import { mockViewport } from '../../../../support/match-media';

function setup(isDesktop = true) {
  const viewport = mockViewport(isDesktop);
  const view = renderHook(() => useShortcutsDialog());
  return { viewport, ...view };
}

function pressHelp(target: Element | Document = document, init = {}) {
  fireEvent.keyDown(target, { key: '?', ...init });
}

function mount(html: string) {
  document.body.insertAdjacentHTML('beforeend', html);
  return document.body.lastElementChild as HTMLElement;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('useShortcutsDialog', () => {
  it('opens on ? from the document on desktop (FSET-17)', () => {
    const { result } = setup();
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isOpen).toBe(false);

    pressHelp();

    expect(result.current.isOpen).toBe(true);
  });

  it('ignores ? while typing in an input (FSET-18)', () => {
    const { result } = setup();
    const input = mount('<input />');

    pressHelp(input);

    expect(result.current.isOpen).toBe(false);
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }])(
    'ignores ? with a modifier held %o (FSET-18)',
    (modifier) => {
      const { result } = setup();

      pressHelp(document, modifier);

      expect(result.current.isOpen).toBe(false);
    },
  );

  it('ignores ? while a modal element exists (FSET-18)', () => {
    const { result } = setup();
    mount('<div aria-modal="true"></div>');

    pressHelp();

    expect(result.current.isOpen).toBe(false);
  });

  it('does nothing on a phone (FSET-19)', () => {
    const { result } = setup(false);

    pressHelp();

    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isOpen).toBe(false);
  });

  it('keeps one open state on a second ? and closes with close (FSET-20)', () => {
    const { result } = setup();

    pressHelp();
    pressHelp();
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('opens with open()', () => {
    const { result } = setup();

    act(() => result.current.open());

    expect(result.current.isOpen).toBe(true);
  });

  it('closes when the viewport turns phone and stays closed on return (FSET-22)', () => {
    const { result, viewport } = setup();
    pressHelp();
    expect(result.current.isOpen).toBe(true);

    act(() => viewport.setDesktop(false));
    expect(result.current.isOpen).toBe(false);

    act(() => viewport.setDesktop(true));
    expect(result.current.isOpen).toBe(false);
  });
});
