import { redirect, type RouteObject } from 'react-router';

import { LoginPage } from '@/pages/login-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { PlaceholderPage } from '@/pages/placeholder-page';
import { ProtectedLayout } from '@/pages/protected-layout';
import { SignupPage } from '@/pages/signup-page';
import type { SessionStore } from '@/shared/session/session-store';

import { redirectIfSession, requireSession } from './guards';

export function createRoutes({
  session,
}: {
  session: SessionStore;
}): RouteObject[] {
  return [
    { index: true, loader: () => redirect('/boards') },
    {
      loader: redirectIfSession(session),
      children: [
        { path: 'login', element: <LoginPage /> },
        { path: 'signup', element: <SignupPage /> },
      ],
    },
    {
      // Pathless parent: its loader guards every protected child before it renders.
      loader: requireSession(session),
      element: <ProtectedLayout />,
      children: [
        { path: 'boards', element: <PlaceholderPage titleKey="boards" /> },
        { path: 'b/:boardId', element: <PlaceholderPage titleKey="board" /> },
        {
          path: 'b/:boardId/t/:cardId',
          element: <PlaceholderPage titleKey="card" />,
        },
        {
          path: 'b/:boardId/labels',
          element: <PlaceholderPage titleKey="labels" />,
        },
        { path: 'settings', element: <PlaceholderPage titleKey="settings" /> },
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ];
}
