import { useTranslation } from 'react-i18next';

import type { Label } from '../model/types';
import type { useCardLabelsViewModel } from '../view-models/use-card-labels-view-model';
import { CardDetailLabelPopover } from './card-detail-label-popover';
import { LabelChip } from './label-chip';

type ViewModel = ReturnType<typeof useCardLabelsViewModel>;

type CardDetailLabelsProps = {
  // The applied labels, in board order (FCD-29).
  applied: Label[];
  // False for an archived card or board (FCLB-21).
  isEditable: boolean;
  boardId: string;
  state: ViewModel['state'];
  actions: ViewModel['actions'];
};

// The Etiquetas field: the applied chips and, when editable, the "+" popover (FCLB-01, FCLB-21).
export function CardDetailLabels({
  applied,
  isEditable,
  boardId,
  state,
  actions,
}: CardDetailLabelsProps) {
  const { t } = useTranslation();

  if (!isEditable && applied.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">
        {t('board.cardDetail.labels')}
      </span>
      <div className="flex min-h-8.5 flex-wrap items-center gap-1.5">
        {applied.length > 0 ? (
          <ul
            aria-label={t('board.cardDetail.labels')}
            className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0"
          >
            {applied.map((label) => (
              <li key={label.id} className="flex">
                <LabelChip label={label} />
              </li>
            ))}
          </ul>
        ) : null}
        {isEditable ? (
          <CardDetailLabelPopover
            isOpen={state.isOpen}
            query={state.query}
            options={state.options}
            boardId={boardId}
            form={state.form}
            isCreating={state.isCreating}
            onOpenChange={actions.setOpen}
            onQueryChange={actions.setQuery}
            onToggle={actions.toggle}
            onStartCreate={actions.startCreate}
            onNameChange={actions.setName}
            onColorChange={actions.setColor}
            onSubmit={actions.submitCreate}
            onCancel={actions.cancelCreate}
          />
        ) : null}
      </div>
    </div>
  );
}
