import { SquareCheck } from 'lucide-react';
import { ProgressBar } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { LoadError } from '@/shared/ui/load-error';

import type { useCardChecklistViewModel } from '../view-models/use-card-checklist-view-model';
import { CardDetailChecklistItem } from './card-detail-checklist-item';

type ViewModel = ReturnType<typeof useCardChecklistViewModel>;

type CardDetailChecklistProps = {
  state: ViewModel['state'];
  actions: ViewModel['actions'];
  // Read-only modes (FCL-31, FCL-32).
  isDisabled: boolean;
};

// Port of the prototype checklist section (design/Task List.dc.html:698-722),
// without the reorder banner, which belongs to the checklist reorder feature.
export function CardDetailChecklist({
  state,
  actions,
  isDisabled,
}: CardDetailChecklistProps) {
  const { t } = useTranslation();
  const { status, items, progress, drafts, error, pendingIds } = state;
  const progressText = `${progress.done}/${progress.total}`;
  // Hidden without items, shown in every mode (FCL-07, FCL-33).
  const hasProgress = status === 'ready' && progress.total > 0;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SquareCheck size={16} aria-hidden className="text-text-secondary" />
        <h3 className="text-lg font-semibold text-text-primary">
          {t('board.cardDetail.checklist.title')}
        </h3>
        {hasProgress ? (
          <span
            className={`text-xs font-medium ${progress.isComplete ? 'text-green-700' : 'text-text-secondary'}`}
          >
            {progressText}
          </span>
        ) : null}
      </div>
      {hasProgress ? (
        <ProgressBar
          aria-label={t('board.cardDetail.checklist.title')}
          value={progress.percent}
          valueLabel={progressText}
          className="h-1.5 overflow-hidden rounded-full bg-surface-sunken"
        >
          <div
            className={`h-full transition-all ${progress.isComplete ? 'bg-green-500' : 'bg-brand'}`}
            style={{ width: `${progress.percent}%` }}
          />
        </ProgressBar>
      ) : null}
      {status === 'error' ? <LoadError onRetry={actions.retryLoad} /> : null}
      {status === 'loading' ? (
        <div
          aria-busy="true"
          className="flex flex-col gap-2 motion-safe:animate-skeleton"
        >
          <div className="h-3 w-4/5 rounded-sm bg-surface-sunken" />
          <div className="h-3 w-3/5 rounded-sm bg-surface-sunken" />
        </div>
      ) : null}
      {status === 'ready' ? (
        <div className="flex flex-col">
          {items.map((item) => (
            <CardDetailChecklistItem
              key={item.id}
              item={item}
              draft={drafts[item.id]}
              isInvalid={error?.target === item.id}
              isPending={pendingIds.has(item.id)}
              isDisabled={isDisabled}
              onToggle={() => actions.toggle(item.id)}
              onChange={(text) => actions.setDraft(item.id, text)}
              onSubmit={() => actions.submitDraft(item.id)}
              onCancel={() => actions.cancelDraft(item.id)}
              onDelete={() => actions.remove(item.id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
