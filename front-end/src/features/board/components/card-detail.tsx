import { ArrowLeft, Columns3, X } from 'lucide-react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { LoadError } from '@/shared/ui/load-error';

import { useCardDetailViewModel } from '../view-models/use-card-detail-view-model';
import { CardDetailDescription } from './card-detail-description';
import { DeleteCardDialog, DiscardChangesDialog } from './card-detail-dialogs';
import { CardDetailDueDate } from './card-detail-due-date';
import { CardDetailFooter } from './card-detail-footer';
import { CardDetailNotices } from './card-detail-notices';
import { CardDetailNotFound, CardDetailSkeleton } from './card-detail-states';
import { CardDetailTitle } from './card-detail-title';
import { LabelChip } from './label-chip';
import { MoveToDialog } from './move-to-dialog';

type CardDetailProps = {
  boardId: string;
  cardId: string;
};

// Port of the prototype card detail (design/Task List.dc.html:590-740, 1161-1162):
// full screen on phones, a centered panel over the board from md (FCD-03, FCD-04).
export function CardDetail({ boardId, cardId }: CardDetailProps) {
  const { t } = useTranslation();
  const { state, actions } = useCardDetailViewModel(boardId, cardId);
  const { card, list, mode } = state;
  const isDisabled = mode !== 'editable';

  return (
    <ModalOverlay
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) actions.close();
      }}
      data-testid="card-detail-overlay"
      className="fixed inset-0 z-40 flex bg-surface-card md:items-start md:justify-center md:overflow-auto md:bg-surface-overlay md:px-6 md:pt-10 md:pb-6"
    >
      <Modal className="flex min-h-0 flex-1 flex-col bg-surface-card md:max-h-[calc(100vh-48px)] md:w-full md:max-w-160 md:flex-none md:overflow-hidden md:rounded-xl md:border md:border-border-subtle md:shadow-lg">
        {/* React Aria hides the board but drops aria-modal from the props, so the
            element is rendered here; the board shortcuts read it (FCD-12). */}
        <Dialog
          render={(props) => (
            // `props` carries role="dialog", which the linter cannot see.
            // oxlint-disable-next-line jsx-a11y/role-supports-aria-props
            <section {...props} aria-modal="true" />
          )}
          aria-label={card?.title ?? t('board.cardDetail.dialog')}
          className="flex min-h-0 flex-1 flex-col outline-none"
        >
          <div className="flex h-14 flex-none items-center gap-2 border-b border-border-subtle pr-3 pl-4">
            <span className="flex md:hidden">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('board.cardDetail.back')}
                onPress={actions.close}
              >
                <ArrowLeft size={16} aria-hidden />
              </Button>
            </span>
            <Columns3
              size={14}
              aria-hidden
              className="flex-none text-text-tertiary"
            />
            {list ? (
              <>
                <span className="text-sm text-text-secondary">
                  {t('board.cardDetail.column')}
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-text-primary">
                  {list.title}
                </span>
              </>
            ) : null}
            <div className="flex-1" />
            <span className="hidden md:flex">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('board.cardDetail.close')}
                onPress={actions.close}
              >
                <X size={16} aria-hidden />
              </Button>
            </span>
          </div>
          {state.status === 'loading' ? <CardDetailSkeleton /> : null}
          {state.status === 'error' ? (
            <LoadError onRetry={actions.retryLoad} />
          ) : null}
          {state.status === 'notFound' ? (
            <CardDetailNotFound onClose={actions.close} />
          ) : null}
          {state.status === 'ready' && card && mode ? (
            <>
              <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pt-4 pb-6 md:px-7 md:pt-5 md:pb-7">
                <CardDetailNotices
                  mode={mode}
                  isColumnArchived={state.isColumnArchived}
                />
                <CardDetailTitle
                  card={card}
                  draft={state.titleDraft}
                  today={state.today}
                  error={state.titleError}
                  isDisabled={isDisabled}
                  onToggleDone={actions.toggleDone}
                  onChange={actions.setTitleDraft}
                  onSubmit={actions.submitTitle}
                  onCancel={actions.cancelTitle}
                />
                <div className="flex flex-wrap gap-x-8 gap-y-4">
                  <CardDetailDueDate
                    dueDate={card.dueDate}
                    isDisabled={isDisabled}
                    onChange={actions.setDueDate}
                    onRemove={actions.removeDueDate}
                  />
                  {state.labels.length > 0 ? (
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-xs font-medium text-text-secondary">
                        {t('board.cardDetail.labels')}
                      </span>
                      {/* Read-only here: labels are changed by a later feature (FCD-29). */}
                      <ul
                        aria-label={t('board.cardDetail.labels')}
                        className="m-0 flex min-h-8.5 list-none flex-wrap items-center gap-1.5 p-0"
                      >
                        {state.labels.map((label) => (
                          <li key={label.id} className="flex">
                            <LabelChip label={label} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <CardDetailDescription
                  description={card.description}
                  draft={state.descriptionDraft}
                  error={state.descriptionError}
                  isDisabled={isDisabled}
                  onChange={actions.setDescriptionDraft}
                  onSave={actions.saveDescription}
                  onCancel={actions.cancelDescription}
                />
              </div>
              <CardDetailFooter
                createdAt={card.createdAt}
                mode={mode}
                isColumnArchived={state.isColumnArchived}
                isPending={state.isPending}
                onMove={actions.openMove}
                onArchive={actions.archive}
                onRestore={actions.restore}
                onDelete={actions.askDelete}
              />
              {state.isMoveOpen ? (
                <MoveToDialog
                  card={card}
                  lists={state.activeLists}
                  onChoose={actions.moveTo}
                  onClose={actions.closeMove}
                />
              ) : null}
              {state.isDeleteOpen ? (
                <DeleteCardDialog
                  onConfirm={actions.confirmDelete}
                  onCancel={actions.cancelDelete}
                />
              ) : null}
            </>
          ) : null}
          {state.isDiscardOpen ? (
            <DiscardChangesDialog
              onDiscard={actions.discard}
              onKeepEditing={actions.keepEditing}
            />
          ) : null}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
