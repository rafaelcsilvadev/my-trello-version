import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BoardGrid } from '@/features/boards/components/board-grid';

afterEach(cleanup);

describe('BoardGrid', () => {
  it('renders each child as a list item, in order', () => {
    render(
      <BoardGrid>
        <span key="a">Roadmap</span>
        <span key="b">Backlog</span>
        <span key="c">Sprint</span>
      </BoardGrid>,
    );

    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Roadmap',
      'Backlog',
      'Sprint',
    ]);
  });
});
