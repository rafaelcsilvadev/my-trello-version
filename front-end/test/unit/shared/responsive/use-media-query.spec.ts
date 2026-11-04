import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DESKTOP_QUERY,
  useMediaQuery,
} from '@/shared/responsive/use-media-query';

import { mockViewport } from '../../../support/match-media';

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the match of the stubbed query', () => {
    mockViewport(true);

    const { result } = renderHook(() => useMediaQuery(DESKTOP_QUERY));

    expect(result.current).toBe(true);
  });

  it('returns false when the query does not match', () => {
    mockViewport(false);

    const { result } = renderHook(() => useMediaQuery(DESKTOP_QUERY));

    expect(result.current).toBe(false);
  });

  it('re-renders when the change event flips it both ways', () => {
    const viewport = mockViewport(false);
    const { result } = renderHook(() => useMediaQuery(DESKTOP_QUERY));

    act(() => viewport.setDesktop(true));
    expect(result.current).toBe(true);

    act(() => viewport.setDesktop(false));
    expect(result.current).toBe(false);
  });

  it('removes its listener on unmount', () => {
    const viewport = mockViewport(true);
    const { unmount } = renderHook(() => useMediaQuery(DESKTOP_QUERY));
    expect(viewport.listenerCount()).toBe(1);

    unmount();

    expect(viewport.listenerCount()).toBe(0);
  });

  it('defines the desktop query as 48rem and up', () => {
    expect(DESKTOP_QUERY).toBe('(min-width: 48rem)');
  });
});
