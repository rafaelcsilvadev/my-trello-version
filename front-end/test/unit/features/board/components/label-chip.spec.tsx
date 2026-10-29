import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LabelChip } from '@/features/board/components/label-chip';
import type { Label } from '@/features/board/model/types';

import { labelFixture } from '../../../../support/fixtures/board';

afterEach(cleanup);

const colors: Label['color'][] = [
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'blue',
  'sky',
  'lime',
  'pink',
  'black',
];

describe('LabelChip', () => {
  it('renders the label name', () => {
    render(<LabelChip label={labelFixture('l1', { name: 'Bug' })} />);

    expect(screen.getByText('Bug')).toBeTruthy();
  });

  it.each(colors)('uses the %s chip and dot classes', (color) => {
    const { container } = render(
      <LabelChip label={labelFixture('l1', { name: 'Bug', color })} />,
    );

    const chip = container.firstElementChild;
    const dot = chip?.firstElementChild;
    expect(chip?.classList.contains(`bg-label-${color}/18`)).toBe(true);
    expect(dot?.classList.contains(`bg-label-${color}`)).toBe(true);
  });
});
