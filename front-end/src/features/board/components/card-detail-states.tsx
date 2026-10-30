import { FileX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';

// Port of the prototype card detail skeleton (design/Task List.dc.html:602-607).
export function CardDetailSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex flex-1 flex-col gap-4.5 px-4 pt-4 pb-6 motion-safe:animate-skeleton md:px-7 md:pt-5 md:pb-7"
    >
      <div className="h-7 w-2/3 rounded-sm bg-surface-sunken" />
      <div className="flex gap-6">
        <div className="h-8.5 w-37.5 rounded-sm bg-surface-sunken" />
        <div className="h-8.5 w-45 rounded-sm bg-surface-sunken" />
      </div>
      <div className="h-3.5 w-1/3 rounded-sm bg-surface-sunken" />
      <div className="h-23 rounded-sm bg-surface-sunken" />
      <div className="h-3.5 w-1/4 rounded-sm bg-surface-sunken" />
      <div className="h-3 w-4/5 rounded-sm bg-surface-sunken" />
      <div className="h-3 w-3/5 rounded-sm bg-surface-sunken" />
    </div>
  );
}

type CardDetailNotFoundProps = {
  onClose: () => void;
};

// Port of the prototype card detail not-found state (design/Task List.dc.html:618-625).
export function CardDetailNotFound({ onClose }: CardDetailNotFoundProps) {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="flex min-h-70 flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center"
    >
      <div className="flex size-13 items-center justify-center rounded-lg bg-surface-sunken text-text-secondary">
        <FileX size={24} aria-hidden />
      </div>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary">
        {t('board.cardDetail.notFound.title')}
      </h2>
      <p className="text-md text-text-secondary">
        {t('board.cardDetail.notFound.detail')}
      </p>
      <div className="mt-2">
        <Button variant="secondary" onPress={onClose}>
          {t('board.cardDetail.close')}
        </Button>
      </div>
    </div>
  );
}
