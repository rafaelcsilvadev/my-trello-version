import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSessionStore,
  useHasSession,
} from '@/shared/session/session-store';
import { createSafeStorage } from '@/shared/storage/safe-storage';

describe('createSessionStore', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('returns a token stored under my-trello.token before it was created', () => {
    localStorage.setItem('my-trello.token', 'jwt');

    const session = createSessionStore(createSafeStorage());

    expect(session.getToken()).toBe('jwt');
  });

  it('returns null when no token is stored', () => {
    expect(createSessionStore(createSafeStorage()).getToken()).toBeNull();
  });

  it('persists the token on setToken', () => {
    const session = createSessionStore(createSafeStorage());

    session.setToken('jwt');

    expect(session.getToken()).toBe('jwt');
    expect(localStorage.getItem('my-trello.token')).toBe('jwt');
  });

  it('removes the token on clear', () => {
    const session = createSessionStore(createSafeStorage());
    session.setToken('jwt');

    session.clear();

    expect(session.getToken()).toBeNull();
    expect(localStorage.getItem('my-trello.token')).toBeNull();
  });

  it('notifies subscribers on setToken and clear', () => {
    const session = createSessionStore(createSafeStorage());
    const listener = vi.fn<() => void>();
    session.subscribe(listener);

    session.setToken('jwt');
    session.clear();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops notifying a subscriber after it unsubscribes', () => {
    const session = createSessionStore(createSafeStorage());
    const listener = vi.fn<() => void>();
    const unsubscribe = session.subscribe(listener);

    unsubscribe();
    session.setToken('jwt');

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps notifying other subscribers when one unsubscribes', () => {
    const session = createSessionStore(createSafeStorage());
    const kept = vi.fn<() => void>();
    const removed = vi.fn<() => void>();
    session.subscribe(kept);
    session.subscribe(removed)();

    session.setToken('jwt');

    expect(kept).toHaveBeenCalledOnce();
    expect(removed).not.toHaveBeenCalled();
  });
});

describe('useHasSession', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('re-renders false -> true -> false across setToken and clear', () => {
    const session = createSessionStore(createSafeStorage());
    const { result } = renderHook(() => useHasSession(session));

    expect(result.current).toBe(false);

    act(() => session.setToken('jwt'));
    expect(result.current).toBe(true);

    act(() => session.clear());
    expect(result.current).toBe(false);
  });
});
