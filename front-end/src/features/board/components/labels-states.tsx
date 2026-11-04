import { Plus, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';

const SKELETON_ROWS = [0, 1, 2];

type LabelsEmptyProps = {
  // True for an archived board: no create button (FLP-38).
  readOnly: boolean;
  onCreate: () => void;
};

// Shown when the board has no labels (FLP-04).
export function LabelsEmpty({ readOnly, onCreate }: LabelsEmptyProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-18 text-center">
      <div className="flex size-13 items-center justify-center rounded-lg bg-brand-soft text-purple-700">
        <Tag size={24} aria-hidden />
      </div>
      <h2 className="mt-2 font-display text-2xl leading-snug font-semibold tracking-tight text-text-primary">
        {t('board.labelsPage.emptyTitle')}
      </h2>
      <p className="max-w-90 text-md text-pretty text-text-secondary">
        {t('board.labelsPage.emptyDetail')}
      </p>
      {readOnly ? null : (
        <div className="mt-2">
          <Button onPress={onCreate}>
            <Plus size={16} aria-hidden />
            {t('board.labelsPage.newLabel')}
          </Button>
        </div>
      )}
    </div>
  );
}

// Placeholder rows while the labels and their usage load (FLP-05).
export function LabelsSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-2 motion-safe:animate-skeleton"
    >
      {SKELETON_ROWS.map((row) => (
        <div
          key={row}
          className="flex min-h-12 items-center gap-3 rounded-md border border-border-subtle bg-surface-card px-3 py-2"
        >
          <div className="h-6 w-24 rounded-sm bg-surface-sunken" />
          <div className="h-3.5 w-28 rounded-xs bg-surface-sunken" />
        </div>
      ))}
    </div>
  );
}
