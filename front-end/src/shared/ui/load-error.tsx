import { CloudOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';

type LoadErrorProps = {
  onRetry: () => void;
};

// Port of the prototype boards load error block (design/Task List.dc.html:218-225).
export function LoadError({ onRetry }: LoadErrorProps) {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 px-4 py-16 text-center"
    >
      <div className="flex size-13 items-center justify-center rounded-lg bg-red-50 text-red-600">
        <CloudOff size={24} aria-hidden />
      </div>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary">
        {t('errors.loadTitle')}
      </h2>
      <p className="text-md text-text-secondary">{t('errors.loadDetail')}</p>
      <div className="mt-2">
        <Button variant="secondary" onPress={onRetry}>
          <RefreshCw size={16} aria-hidden />
          {t('errors.retry')}
        </Button>
      </div>
    </div>
  );
}
