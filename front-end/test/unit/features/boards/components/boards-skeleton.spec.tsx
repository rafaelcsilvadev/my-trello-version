import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BoardsSkeleton } from '@/features/boards/components/boards-skeleton';

afterEach(cleanup);

describe('BoardsSkeleton', () => {
  it('marks itself busy and shows 6 card placeholders', () => {
    const { container } = render(<BoardsSkeleton />);

    const skeleton = container.firstElementChild;
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');
    expect(skeleton?.children).toHaveLength(6);
  });
});
