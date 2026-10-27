import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BoardSkeleton } from '@/features/board/components/board-skeleton';

afterEach(cleanup);

describe('BoardSkeleton', () => {
  it('marks itself busy and shows 3 column placeholders with cards', () => {
    const { container } = render(<BoardSkeleton />);

    const skeleton = container.firstElementChild;
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');
    const columns = skeleton?.lastElementChild?.children;
    expect(columns).toHaveLength(3);
    for (const column of Array.from(columns ?? [])) {
      // The title bar plus at least 2 card placeholders.
      expect(column.children.length).toBeGreaterThanOrEqual(3);
    }
  });
});
