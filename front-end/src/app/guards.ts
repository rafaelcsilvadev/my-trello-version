import { type LoaderFunctionArgs, redirect } from 'react-router';

import type { SessionStore } from '@/shared/session/session-store';

export function requireSession(session: SessionStore) {
  return ({ request }: LoaderFunctionArgs) => {
    if (session.getToken() !== null) {
      return null;
    }
    const { pathname, search } = new URL(request.url);
    return redirect(`/login?redirect=${encodeURIComponent(pathname + search)}`);
  };
}

export function redirectIfSession(session: SessionStore) {
  return () => (session.getToken() !== null ? redirect('/boards') : null);
}
