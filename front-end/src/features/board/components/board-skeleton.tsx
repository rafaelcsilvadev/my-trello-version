// Card heights of each of the 3 placeholder columns (2–3 cards each), from the
// prototype (design/Task List.dc.html:1191).
const COLUMN_CARD_HEIGHTS = [
  ['h-14', 'h-18', 'h-22'],
  ['h-14', 'h-18'],
  ['h-14', 'h-18', 'h-22'],
];

// Port of the prototype board skeleton (design/Task List.dc.html:267-277).
export function BoardSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-3.5 motion-safe:animate-skeleton"
    >
      <div className="h-7 w-65 max-w-2/3 rounded-sm bg-surface-sunken" />
      <div className="flex flex-wrap gap-2.5">
        <div className="h-9 w-65 rounded-sm bg-surface-sunken" />
        <div className="h-9 w-30 rounded-sm bg-surface-sunken" />
        <div className="h-9 w-37.5 rounded-sm bg-surface-sunken" />
      </div>
      <div className="flex items-start gap-3 overflow-hidden md:gap-3.5">
        {COLUMN_CARD_HEIGHTS.map((heights, column) => (
          <div
            key={column}
            className="flex w-11/12 flex-none flex-col gap-2 rounded-lg bg-surface-sunken p-2 md:w-71"
          >
            <div className="mx-1.5 my-2 h-3.5 w-1/2 rounded-xs bg-border-subtle" />
            {heights.map((height, card) => (
              <div
                key={card}
                className={`rounded-md border border-border-subtle bg-surface-card ${height}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
