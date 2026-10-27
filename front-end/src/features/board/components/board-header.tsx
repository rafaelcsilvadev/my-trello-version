import { ArrowLeft, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ActionMenu } from '@/shared/ui/menu';

import type { Board } from '../model/types';

type BoardHeaderProps = {
  board: Board;
};

// Port of the prototype board header (design/Task List.dc.html:300-316) plus the
// phone back arrow of the top bar (:161), shown below the md breakpoint.
export function BoardHeader({ board }: BoardHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Link
          to="/boards"
          aria-label={t('board.header.back')}
          className="inline-flex size-(--control-md) flex-none items-center justify-center rounded-md text-text-secondary hover:bg-neutral-100 focus-visible:shadow-focus focus-visible:outline-none md:hidden"
        >
          <ArrowLeft size={16} aria-hidden />
        </Link>
        <h1 className="m-0 min-w-0 font-display text-3xl leading-tight font-semibold tracking-tight wrap-anywhere text-text-primary max-md:flex-1">
          {board.title}
        </h1>
        <ActionMenu
          label={t('board.header.menu')}
          items={[
            {
              id: 'labels',
              label: t('board.header.labels'),
              icon: Tag,
              href: `/b/${board.id}/labels`,
            },
          ]}
        />
      </div>
      {board.description !== null ? (
        <p className="m-0 max-w-180 text-md text-pretty wrap-anywhere text-text-secondary">
          {board.description}
        </p>
      ) : null}
    </div>
  );
}
