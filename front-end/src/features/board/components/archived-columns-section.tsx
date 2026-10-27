import type { TFunction } from 'i18next';
import { Columns3, Loader, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatShortDate } from '@/shared/i18n/format-date';
import { Button } from '@/shared/ui/button';
import { LoadError } from '@/shared/ui/load-error';

import type { ArchivedColumnItem } from '../model/types';
import type { ArchivedStatus } from '../view-models/use-board-view-model';

type ArchivedColumnsSectionProps = {
  // Newest `archivedAt` first (`toArchivedColumns`).
  items: ArchivedColumnItem[];
  status: ArchivedStatus;
  isReadOnly: boolean;
  pendingIds: ReadonlySet<string>;
  onRestore: (listId: string) => void;
  onDelete: (listId: string) => void;
  onRetry: () => void;
};

// Port of the prototype archived columns section (design/Task List.dc.html:478-496).
export function ArchivedColumnsSection({
  items,
  status,
  isReadOnly,
  pendingIds,
  onRestore,
  onDelete,
  onRetry,
}: ArchivedColumnsSectionProps) {
  const { t } = useTranslation();
  const title = t('board.archivedColumns.title');

  return (
    <section
      aria-label={title}
      className="flex w-11/12 flex-none snap-start flex-col gap-2 rounded-lg border-2 border-dashed border-border-default bg-transparent p-2 md:w-71"
    >
      <div className="flex min-h-8 items-center gap-2 px-1 text-text-secondary">
        <Columns3 size={16} aria-hidden />
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
          <div className="h-24 rounded-md bg-surface-sunken motion-safe:animate-skeleton" />
        </div>
      ) : null}
      {status === 'ready' ? (
        <div className="flex flex-col gap-2">
          {items.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {items.map(({ list, cardCount }) => {
                const isPending = pendingIds.has(list.id);
                return (
                  <li
                    key={list.id}
                    aria-label={list.title}
                    className="flex flex-col gap-2 rounded-md border border-border-subtle bg-neutral-25 px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 text-md font-semibold wrap-anywhere text-text-primary">
                        {list.title}
                      </div>
                      {isPending ? (
                        <span
                          title={t('board.card.pending')}
                          className="inline-flex flex-none text-text-tertiary"
                        >
                          <Loader
                            size={14}
                            className="motion-safe:animate-spin"
                            aria-hidden
                          />
                          <span className="sr-only">
                            {t('board.card.pending')}
                          </span>
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-text-tertiary">
                      <span>
                        {t('board.archivedColumns.archivedOn', {
                          date: formatShortDate(
                            list.archivedAt ?? list.updatedAt,
                            t,
                          ),
                        })}
                      </span>
                      {/* Unknown until the column's active cards load. */}
                      {cardCount !== undefined ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>{cardCountText(cardCount, t)}</span>
                        </>
                      ) : null}
                    </div>
                    {isReadOnly ? null : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          isDisabled={isPending}
                          onPress={() => onRestore(list.id)}
                        >
                          <RotateCcw size={14} aria-hidden />
                          <span>{t('board.archivedColumns.restore')}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          isDisabled={isPending}
                          onPress={() => onDelete(list.id)}
                        >
                          <Trash2 size={14} aria-hidden />
                          <span>
                            {t('board.archivedColumns.deleteForever')}
                          </span>
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-3 py-4.5 text-center text-sm text-text-tertiary">
              {t('board.archivedColumns.empty')}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

// Explicit keys: pt plural rules treat 0 as "one", which would read "0 tarefa".
function cardCountText(count: number, t: TFunction): string {
  return count === 1
    ? t('board.archivedColumns.oneCard')
    : t('board.archivedColumns.cards', { count });
}
