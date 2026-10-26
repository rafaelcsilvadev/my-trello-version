import { boardGridClassName } from './board-grid';

// Title widths of the 6 placeholders, from the prototype (design/Task List.dc.html:1188).
const TITLE_WIDTHS = ['w-1/2', 'w-3/4', 'w-2/3', 'w-3/5', 'w-4/5', 'w-1/2'];

// Port of the prototype skeleton (design/Task List.dc.html:208-216).
export function BoardsSkeleton() {
  return (
    <div aria-busy="true" className={boardGridClassName}>
      {TITLE_WIDTHS.map((width, index) => (
        <div
          key={index}
          className="flex h-26 flex-col justify-between rounded-lg border border-border-subtle bg-surface-card p-4 motion-safe:animate-skeleton"
        >
          <div className={`h-3.5 rounded-xs bg-surface-sunken ${width}`} />
          <div className="h-2.5 w-2/5 rounded-xs bg-surface-sunken" />
        </div>
      ))}
    </div>
  );
}
