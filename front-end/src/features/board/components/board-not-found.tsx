import { ArrowLeft, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

// Port of the prototype board not-found state (design/Task List.dc.html:289-296).
export function BoardNotFound() {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 px-4 py-18 text-center"
    >
      <div className="flex size-13 items-center justify-center rounded-lg bg-surface-sunken text-text-secondary">
        <SearchX size={24} aria-hidden />
      </div>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary">
        {t('board.notFound.title')}
      </h2>
      <p className="text-md text-text-secondary">
        {t('board.notFound.detail')}
      </p>
      <div className="mt-2">
        {/* A link styled as the primary md button (shared/ui/button.tsx). */}
        <Link
          to="/boards"
          className="inline-flex h-(--control-md) items-center justify-center gap-2 rounded-sm border border-transparent bg-brand px-3.5 text-md leading-none font-medium whitespace-nowrap text-on-brand transition-[background,box-shadow] duration-(--dur-fast) hover:bg-brand-hover focus-visible:shadow-focus focus-visible:outline-none active:translate-y-[0.5px] active:bg-(--brand-press)"
        >
          <ArrowLeft size={16} aria-hidden />
          {t('board.notFound.back')}
        </Link>
      </div>
    </div>
  );
}
