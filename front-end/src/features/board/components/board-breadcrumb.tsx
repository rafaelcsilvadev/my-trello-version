import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useBoard } from '../api/queries';

type BoardBreadcrumbProps = {
  boardId: string;
};

// Port of the prototype top-bar breadcrumb (design/Task List.dc.html:169-175).
// Desktop only; renders nothing until the board loads, and on any error.
export function BoardBreadcrumb({ boardId }: BoardBreadcrumbProps) {
  const { t } = useTranslation();
  const { data: board } = useBoard(boardId);

  if (!board) {
    return null;
  }

  return (
    <nav
      aria-label={t('board.breadcrumb')}
      className="ml-2 hidden min-w-0 items-center gap-1 md:flex"
    >
      <ChevronRight size={16} className="text-text-disabled" aria-hidden />
      <Link
        to="/boards"
        className="rounded-sm px-2 py-1.5 text-md font-medium whitespace-nowrap text-text-secondary hover:bg-neutral-100 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
      >
        {t('routes.boards')}
      </Link>
      <ChevronRight size={16} className="text-text-disabled" aria-hidden />
      <span
        aria-current="page"
        className="truncate px-1.5 text-md font-semibold text-text-primary"
      >
        {board.title}
      </span>
    </nav>
  );
}
