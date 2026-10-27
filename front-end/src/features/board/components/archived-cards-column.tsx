import { Archive } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LoadError } from '@/shared/ui/load-error';

import type { ArchivedCardItem, DateParts, Label } from '../model/types';
import type { ArchivedStatus } from '../view-models/use-board-view-model';
import { CardTile } from './card-tile';

type ArchivedCardsColumnProps = {
  // Newest `archivedAt` first (`toArchivedCards`).
  items: ArchivedCardItem[];
  status: ArchivedStatus;
  labels: ReadonlyMap<string, Label>;
  today: DateParts;
  onRetry: () => void;
};

// Port of the prototype virtual column (design/Task List.dc.html:455-477).
export function ArchivedCardsColumn({
  items,
  status,
  labels,
  today,
  onRetry,
}: ArchivedCardsColumnProps) {
  const { t } = useTranslation();
  const title = t('board.archivedCards.title');

  return (
    <section
      aria-label={title}
      className="flex w-11/12 flex-none snap-start flex-col gap-2 rounded-lg border-2 border-dashed border-border-default bg-transparent p-2 md:w-71"
    >
      <div className="flex min-h-8 items-center gap-2 px-1 text-text-secondary">
        <Archive size={16} aria-hidden />
        <span className="flex-1 text-md font-semibold">{title}</span>
        {status === 'ready' ? (
          <span className="inline-flex h-5 min-w-5.5 items-center justify-center rounded-xs bg-surface-sunken px-1.5 text-xs font-medium">
            {items.length}
          </span>
        ) : null}
      </div>
      {status === 'error' ? <LoadError onRetry={onRetry} /> : null}
      {status === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <div className="h-16 rounded-md bg-surface-sunken motion-safe:animate-skeleton" />
          <div className="h-16 rounded-md bg-surface-sunken motion-safe:animate-skeleton" />
        </div>
      ) : null}
      {status === 'ready' ? (
        <div className="flex flex-col gap-2">
          {items.map(({ card, fromTitle }) => (
            <CardTile
              key={card.id}
              card={card}
              labels={labels}
              today={today}
              mode="archived"
              fromTitle={fromTitle}
              isPending={false}
              isReadOnly
              onToggleDone={() => {}}
            />
          ))}
          {items.length === 0 ? (
            <div className="px-3 py-4.5 text-center text-sm text-text-tertiary">
              {t('board.archivedCards.empty')}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
