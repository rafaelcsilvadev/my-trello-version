import { redirect, type RouteObject } from 'react-router';

import { BoardPage } from '@/pages/board-page';
import { BoardsPage } from '@/pages/boards-page';
import { LoginPage } from '@/pages/login-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { PlaceholderPage } from '@/pages/placeholder-page';
import { ProtectedLayout } from '@/pages/protected-layout';
import { SettingsPage } from '@/pages/settings-page';
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
        { path: 'boards', element: <BoardsPage /> },
        { path: 'b/:boardId', element: <BoardPage /> },
        {
          path: 'b/:boardId/t/:cardId',
          element: <PlaceholderPage titleKey="card" />,
        },
        {
          path: 'b/:boardId/labels',
          element: <PlaceholderPage titleKey="labels" />,
        },
        { path: 'settings', element: <SettingsPage /> },
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ];
}
