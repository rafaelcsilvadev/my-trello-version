import { ArrowLeft, Lock, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/shared/ui/button';
import { LoadError } from '@/shared/ui/load-error';

import { useLabelsViewModel } from '../view-models/use-labels-view-model';
import { BoardNotFound } from './board-not-found';
import { DeleteLabelDialog } from './delete-label-dialog';
import { LabelFormDialog } from './label-form-dialog';
import { LabelsList } from './labels-list';
import { LabelsEmpty, LabelsSkeleton } from './labels-states';

type LabelsScreenProps = {
  boardId: string;
};

// The labels management screen of one board (FLP-01, FLP-04 to FLP-07, FLP-09).
export function LabelsScreen({ boardId }: LabelsScreenProps) {
  const { state, actions } = useLabelsViewModel(boardId);
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  // The button that opened the open dialog; focus goes back to it on close (FLP-36).
  const opener = useRef<HTMLElement | null>(null);
  const rowCount = state.rows.length;
  const dialogOpen = state.form !== null || state.confirmDelete !== null;

  // A deleted row's button is gone, so focus falls back to the create button.
  // Runs again as rows change, for a button disabled while its change is pending.
  useEffect(() => {
    const target = opener.current;
    if (dialogOpen || !target) return;
    const fallback = root.current?.querySelector<HTMLElement>(
      '[data-new-label] button',
    );
    const button = target.isConnected ? target : fallback;
    button?.focus();
    if (button && document.activeElement === button) opener.current = null;
  }, [dialogOpen, rowCount, state.rows]);

  function remember<Args extends unknown[]>(open: (...args: Args) => void) {
    return (...args: Args) => {
      opener.current = document.activeElement as HTMLElement | null;
      open(...args);
    };
  }

  switch (state.status) {
    case 'error':
      return <LoadError onRetry={actions.retry} />;
    case 'notFound':
      return <BoardNotFound />;
  }

  const isReady = state.status === 'ready';
  const isEmpty = isReady && rowCount === 0;
  const { form, confirmDelete } = state;

  return (
    <div ref={root} className="flex min-w-0 flex-col gap-3.5">
      <div className="flex items-start gap-2">
        <Link
          to={`/b/${boardId}`}
          aria-label={t('board.labelsPage.backToBoard')}
          className="inline-flex size-(--control-md) flex-none items-center justify-center rounded-md text-text-secondary hover:bg-neutral-100 focus-visible:shadow-focus focus-visible:outline-none md:hidden"
        >
          <ArrowLeft size={16} aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="m-0 font-display text-3xl leading-tight font-semibold tracking-tight text-text-primary">
            {t('board.labelsPage.title')}
          </h1>
          {state.board ? (
            <p className="m-0 text-md text-pretty wrap-anywhere text-text-secondary">
              {t('board.labelsPage.subtitle', { board: state.board.title })}
            </p>
          ) : null}
        </div>
        {/* The empty state carries its own create button. */}
        {state.readOnly || isEmpty ? null : (
          <div data-new-label className="flex-none">
            <Button onPress={remember(actions.openCreate)}>
              <Plus size={16} aria-hidden />
              {t('board.labelsPage.newLabel')}
            </Button>
          </div>
        )}
      </div>
      {state.readOnly ? (
        <output className="flex items-center gap-2 rounded-sm bg-surface-sunken px-3 py-2 text-sm font-medium text-text-secondary">
          <Lock size={14} aria-hidden />
          {t('board.cardDetail.boardArchivedNotice')}
        </output>
      ) : null}
      {isReady ? null : <LabelsSkeleton />}
      {isEmpty ? (
        <div data-new-label>
          <LabelsEmpty
            readOnly={state.readOnly}
            onCreate={remember(actions.openCreate)}
          />
        </div>
      ) : null}
      {isReady && !isEmpty ? (
        <LabelsList
          rows={state.rows}
          readOnly={state.readOnly}
          onEdit={remember(actions.openEdit)}
          onDelete={remember(actions.openDelete)}
        />
      ) : null}
      {form ? (
        <LabelFormDialog
          mode={form.mode}
          name={form.name}
          color={form.color}
          error={form.error}
          isSubmitting={form.isSubmitting}
          onNameChange={actions.setName}
          onColorChange={actions.setColor}
          onSubmit={actions.submit}
          onClose={actions.closeForm}
        />
      ) : null}
      {confirmDelete ? (
        <DeleteLabelDialog
          label={confirmDelete.label}
          cardCount={confirmDelete.count}
          onConfirm={actions.confirmDelete}
          onCancel={actions.closeDelete}
        />
      ) : null}
    </div>
  );
}
