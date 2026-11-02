import { SquareCheck } from 'lucide-react';
import {
  type DragEvent,
  Fragment,
  type KeyboardEvent,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  TextField as AriaTextField,
  Input,
  ProgressBar,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { LoadError } from '@/shared/ui/load-error';

import { dropIndex } from '../model/move';
import type { ChecklistItem } from '../model/types';
import type { useCardChecklistViewModel } from '../view-models/use-card-checklist-view-model';
import {
  CardDetailChecklistItem,
  type ItemMove,
} from './card-detail-checklist-item';
import { MoveAnnouncer } from './move-announcer';
import { MoveBanner } from './move-banner';

type ViewModel = ReturnType<typeof useCardChecklistViewModel>;

type CardDetailChecklistProps = {
  state: ViewModel['state'];
  actions: ViewModel['actions'];
  // Read-only modes (FCL-31, FCL-32).
  isDisabled: boolean;
};

// Port of the prototype checklist section (design/Task List.dc.html:698-722).
export function CardDetailChecklist({
  state,
  actions,
  isDisabled,
}: CardDetailChecklistProps) {
  const { t } = useTranslation();
  const { status, items, progress, drafts, newText, error, pendingIds } = state;
  const { preview, bannerText, announcement, keyboardItemId } = state.move;
  const addInput = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  // The last keyboard item, refocused while the list re-renders after the session.
  const focusItem = useRef<string | null>(null);
  // The other rows of a mouse drag, which drop indexes count (FCLD-04).
  const otherIds = items
    .map((item) => item.id)
    .filter((id) => id !== preview.sourceId);
  // The row the placeholder renders before; `null` puts it last.
  const placeholderBefore =
    preview.placeholderIndex === null
      ? undefined
      : (otherIds[preview.placeholderIndex] ?? null);

  // FCLD-15: a step reorders the picked row's node, which can drop focus to `body`.
  useLayoutEffect(() => {
    if (keyboardItemId) focusItem.current = keyboardItemId;
    const id = focusItem.current;
    if (!id) return;
    // Focus elsewhere means the user moved it; after the session it also ends the refocus.
    if (document.activeElement !== document.body) {
      if (!keyboardItemId) focusItem.current = null;
      return;
    }
    sectionRef.current
      ?.querySelector<HTMLElement>(`[data-item-grip-id="${CSS.escape(id)}"]`)
      ?.focus();
  });
  const progressText = `${progress.done}/${progress.total}`;
  // Hidden without items, shown in every mode (FCL-07, FCL-33).
  const hasProgress = status === 'ready' && progress.total > 0;

  function onAddKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      actions.add();
    }
  }

  function onDelete(id: string) {
    actions.remove(id);
    // The pressed button goes away with its row (FCL-25).
    addInput.current?.focus();
  }

  // A drop target must cancel `dragover` to receive the drop.
  function onTargetDragOver(event: DragEvent, index: number | null) {
    event.preventDefault();
    if (index !== null) actions.move.hover(index);
  }

  function movableOf(item: ChecklistItem): ItemMove | null {
    if (isDisabled) return null;
    return {
      canDrag: actions.move.canDrag(item.id),
      isSource: preview.sourceId === item.id,
      isLifted: preview.liftedId === item.id,
      isPicked: keyboardItemId === item.id,
      onStart: (input) => actions.move.start(item.id, input),
      onKey: (event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          actions.move.step(event.key);
        } else if (event.key === 'Escape') {
          actions.move.cancel();
        } else {
          actions.move.drop();
        }
      },
      onHover: (slot) => actions.move.hover(dropIndex(otherIds, item.id, slot)),
      onDrop: actions.move.drop,
      // After a drop the session is gone, so this only cancels an abandoned drag.
      onEnd: actions.move.cancel,
    };
  }

  const dropPlaceholder = (
    <div
      data-testid="checklist-drop-placeholder"
      onDragOver={(event) => onTargetDragOver(event, null)}
      onDrop={actions.move.drop}
      className="h-9.5 rounded-sm border-2 border-dashed border-border-focus"
    />
  );

  return (
    <section ref={sectionRef} className="flex flex-col gap-2">
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
      {bannerText ? <MoveBanner text={bannerText} /> : null}
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
          {preview.items.map((item) => (
            <Fragment key={item.id}>
              {placeholderBefore === item.id ? dropPlaceholder : null}
              <CardDetailChecklistItem
                item={item}
                draft={drafts[item.id]}
                isInvalid={error?.target === item.id}
                isPending={pendingIds.has(item.id)}
                isDisabled={isDisabled}
                onToggle={() => actions.toggle(item.id)}
                onChange={(text) => actions.setDraft(item.id, text)}
                onSubmit={() => actions.submitDraft(item.id)}
                onCancel={() => actions.cancelDraft(item.id)}
                onDelete={() => onDelete(item.id)}
                movable={movableOf(item)}
              />
            </Fragment>
          ))}
          {placeholderBefore === null ? dropPlaceholder : null}
          {preview.sourceId === null ? null : (
            <div
              data-testid="checklist-drop-end"
              onDragOver={(event) =>
                onTargetDragOver(event, dropIndex(otherIds, null, 'after'))
              }
              onDrop={actions.move.drop}
              className="h-3"
            />
          )}
          {isDisabled ? null : (
            <AriaTextField
              value={newText}
              onChange={actions.setNewText}
              aria-label={t('board.cardDetail.checklist.addItem')}
              isInvalid={error?.target === 'new'}
              validationBehavior="aria"
              className="flex"
            >
              <Input
                ref={addInput}
                placeholder={t('board.cardDetail.checklist.addItem')}
                onKeyDown={onAddKeyDown}
                className="h-8.5 min-w-0 flex-1 rounded-sm border border-dashed border-border-default bg-transparent px-2.5 text-md text-text-primary outline-0 placeholder:text-text-tertiary focus:border-solid focus:border-border-focus focus:bg-surface-card data-invalid:border-danger"
              />
            </AriaTextField>
          )}
        </div>
      ) : null}
      {/* Inside the dialog, where screen readers read it (FCLD-17). */}
      <MoveAnnouncer text={announcement} />
      {/* One message for the add field and the rows (FCL-23). */}
      {error === null ? null : (
        <p role="alert" className="text-xs text-red-600">
          {t(`board.fieldErrors.${error.code}`)}
        </p>
      )}
    </section>
  );
}
