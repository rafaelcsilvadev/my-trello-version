import { Children, type ReactNode } from 'react';

type BoardGridProps = {
  children: ReactNode;
};

// Port of the prototype `grid-boards` (design/Task List.dc.html:241): as many 260 px
// columns as fit, one column on a 360 px screen. Shared with the skeleton.
export const boardGridClassName =
  'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4';

export function BoardGrid({ children }: BoardGridProps) {
  return (
    <ul className={boardGridClassName}>
      {Children.map(children, (child) => (
        <li>{child}</li>
      ))}
    </ul>
  );
}
