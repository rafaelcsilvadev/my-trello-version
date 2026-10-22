import type { SessionStore } from '@/shared/session/session-store';

type SessionExpiryDeps = {
  session: SessionStore;
  clearCache(): void;
  navigate(to: string): void;
  currentLocation(): { pathname: string; search: string };
};

const AUTH_PAGES = new Set(['/login', '/signup']);

export function createSessionExpiryHandler({
  session,
  clearCache,
  navigate,
  currentLocation,
}: SessionExpiryDeps): () => void {
  return () => {
    // A parallel 401 already expired the session.
    if (session.getToken() === null) {
      return;
    }

    session.clear();
    clearCache();
    navigate(`/login?${loginParams(currentLocation())}`);
  };
}

function loginParams({
  pathname,
  search,
}: {
  pathname: string;
  search: string;
}): URLSearchParams {
  const redirect = AUTH_PAGES.has(pathname)
    ? new URLSearchParams(search).get('redirect')
    : pathname + search;
  const params = new URLSearchParams();
  if (redirect) {
    params.set('redirect', redirect);
  }
  params.set('reason', 'session-expired');
  return params;
}
