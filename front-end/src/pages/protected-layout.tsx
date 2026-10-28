import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useMatch } from 'react-router';

import { BoardBreadcrumb } from '@/features/board';
import { Logo } from '@/shared/ui/logo';

// Port of the prototype top bar (design/Task List.dc.html:160-193).
const linkFocus = 'focus-visible:shadow-focus focus-visible:outline-none';

export function ProtectedLayout() {
  const { t } = useTranslation();
  // useMatch also treats a trailing slash as the same route.
  const onSettings = useMatch('/settings') !== null;
  const boardId = useMatch('/b/:boardId/*')?.params.boardId;

  return (
    <>
      <header className="flex h-14 flex-none items-center gap-2 border-b border-border-subtle bg-surface-card px-4">
        <Link to="/boards" className={`rounded-sm p-1 ${linkFocus}`}>
          <Logo />
        </Link>
        {boardId && <BoardBreadcrumb boardId={boardId} />}
        <div className="flex-1" />
        {!onSettings && (
          <Link
            to="/settings"
            aria-label={t('nav.settings')}
            className={`inline-flex size-(--control-md) items-center justify-center rounded-md text-text-secondary hover:bg-neutral-100 ${linkFocus}`}
          >
            <Settings size={18} aria-hidden="true" />
          </Link>
        )}
      </header>
      <Outlet />
    </>
  );
}
