import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSessionExpiryHandler } from '@/shared/session/session-expiry';
import { createSessionStore } from '@/shared/session/session-store';
import { createSafeStorage } from '@/shared/storage/safe-storage';

function setup(location: { pathname: string; search: string }) {
  const session = createSessionStore(createSafeStorage());
  session.setToken('jwt');
  const clearCache = vi.fn<() => void>();
  const navigate = vi.fn<(to: string) => void>();
  const expire = createSessionExpiryHandler({
    session,
    clearCache,
    navigate,
    currentLocation: () => location,
  });

  return { session, clearCache, navigate, expire };
}

describe('createSessionExpiryHandler', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('clears the token and cache and sends the user to login with the current path as redirect', () => {
    const { session, clearCache, navigate, expire } = setup({
      pathname: '/b/x/t/y',
      search: '?q=1',
    });

    expire();

    expect(session.getToken()).toBeNull();
    expect(clearCache).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(
      '/login?redirect=%2Fb%2Fx%2Ft%2Fy%3Fq%3D1&reason=session-expired',
    );
  });

  it('reacts only once to parallel 401s', () => {
    const { clearCache, navigate, expire } = setup({
      pathname: '/boards',
      search: '',
    });

    expire();
    expire();

    expect(clearCache).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('does nothing when there is no session', () => {
    const { session, clearCache, navigate, expire } = setup({
      pathname: '/boards',
      search: '',
    });
    session.clear();

    expire();

    expect(clearCache).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the existing redirect on /login and only sets the reason', () => {
    const { navigate, expire } = setup({
      pathname: '/login',
      search: '?redirect=%2Fboards',
    });

    expire();

    expect(navigate).toHaveBeenCalledWith(
      '/login?redirect=%2Fboards&reason=session-expired',
    );
  });

  it('omits the redirect on /login when there was none', () => {
    const { navigate, expire } = setup({ pathname: '/login', search: '' });

    expire();

    expect(navigate).toHaveBeenCalledWith('/login?reason=session-expired');
  });

  it('keeps the existing redirect on /signup and sends the user to login', () => {
    const { navigate, expire } = setup({
      pathname: '/signup',
      search: '?redirect=%2Fb%2Fx',
    });

    expire();

    expect(navigate).toHaveBeenCalledWith(
      '/login?redirect=%2Fb%2Fx&reason=session-expired',
    );
  });

  it('drops other query params on /login and replaces a stale reason', () => {
    const { navigate, expire } = setup({
      pathname: '/login',
      search: '?redirect=%2Fboards&reason=other&foo=1',
    });

    expire();

    expect(navigate).toHaveBeenCalledWith(
      '/login?redirect=%2Fboards&reason=session-expired',
    );
  });

  it('expires again after a new token is set', () => {
    const { session, clearCache, navigate, expire } = setup({
      pathname: '/boards',
      search: '',
    });

    expire();
    session.setToken('jwt-2');
    expire();

    expect(clearCache).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(session.getToken()).toBeNull();
  });
});
