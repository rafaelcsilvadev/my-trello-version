import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';

import type { LabelUsage } from '../model/label-usage';
import type { Label } from '../model/types';
import { LabelChip } from './label-chip';

export type LabelsListRow = {
  label: Label;
  usage: LabelUsage;
  // A change to this label is still in flight (FLP-22).
  pending: boolean;
};

export type LabelsListProps = {
  rows: LabelsListRow[];
  // True for an archived board: no edit or delete (FLP-38).
  readOnly: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

// One row per label: chip, usage text and, when editable, the two icon buttons (FLP-02, FLP-03).
export function LabelsList({
  rows,
  readOnly,
  onEdit,
  onDelete,
}: LabelsListProps) {
  const { t } = useTranslation();

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map(({ label, usage, pending }) => (
        <li
          key={label.id}
          className="flex min-h-12 items-center gap-3 rounded-md border border-border-subtle bg-surface-card px-3 py-2"
        >
          <LabelChip label={label} />
          <span className="min-w-0 flex-1 text-sm text-text-secondary">
            {t(`board.labelsPage.usage.${usage.key}`, { count: usage.count })}
          </span>
          {readOnly ? null : (
            <div className="flex flex-none items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('board.labelsPage.editLabelNamed', {
                  name: label.name,
                })}
                isDisabled={pending}
                onPress={() => onEdit(label.id)}
              >
                <Pencil aria-hidden="true" className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('board.labelsPage.deleteLabelNamed', {
                  name: label.name,
                })}
                isDisabled={pending}
                onPress={() => onDelete(label.id)}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
