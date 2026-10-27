import { useTranslation } from 'react-i18next';

type ColumnPagerProps = {
  titles: string[];
  index: number;
  onSelect: (index: number) => void;
};

// Port of the prototype column pager (design/Task List.dc.html:513-520).
// Phone only: board-columns reports the column in view and scrolls on select.
export function ColumnPager({ titles, index, onSelect }: ColumnPagerProps) {
  const { t } = useTranslation();

  if (titles.length === 0) {
    return null;
  }

  return (
    <div className="-mt-1 flex flex-col items-center gap-2 md:hidden">
      <div className="flex items-center gap-1.5">
        {titles.map((title, i) => (
          <button
            // Titles may repeat, so the position is the key.
            key={i}
            type="button"
            aria-label={t('board.pager.goTo', { title })}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => {
              onSelect(i);
            }}
            className={`h-1.5 cursor-pointer rounded-full transition-all focus-visible:shadow-focus focus-visible:outline-none ${i === index ? 'w-4.5 bg-brand' : 'w-1.5 bg-border-default'}`}
          />
        ))}
      </div>
      <span aria-live="polite" className="text-xs text-text-secondary">
        {titles[index] === undefined
          ? null
          : t('board.pager.position', {
              title: titles[index],
              i: index + 1,
              n: titles.length,
            })}
      </span>
    </div>
  );
}
