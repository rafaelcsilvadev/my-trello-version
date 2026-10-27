import { describe, expect, it } from 'vitest';

import { visibleIndex } from '@/features/board/model/pager';

const WIDTH = 300;
const GAP = 12;
const STRIDE = WIDTH + GAP;

describe('visibleIndex', () => {
  it('returns the first column at the start', () => {
    expect(visibleIndex(0, WIDTH, GAP, 5)).toBe(0);
  });

  it('returns the column snapped in the middle', () => {
    expect(visibleIndex(2 * STRIDE, WIDTH, GAP, 5)).toBe(2);
  });

  it('keeps the current column until it is scrolled less than half a column', () => {
    expect(visibleIndex(STRIDE * 0.4, WIDTH, GAP, 5)).toBe(0);
  });

  it('moves to the next column once scrolled past half a column', () => {
    expect(visibleIndex(STRIDE * 0.6, WIDTH, GAP, 5)).toBe(1);
  });

  it('returns the last column at the end', () => {
    expect(visibleIndex(4 * STRIDE, WIDTH, GAP, 5)).toBe(4);
  });

  it('clamps a scroll past the end to the last column', () => {
    expect(visibleIndex(10 * STRIDE, WIDTH, GAP, 5)).toBe(4);
  });

  it('clamps a negative overscroll to the first column', () => {
    expect(visibleIndex(-80, WIDTH, GAP, 5)).toBe(0);
  });

  it('returns 0 when there are no columns', () => {
    expect(visibleIndex(500, WIDTH, GAP, 0)).toBe(0);
  });

  it('returns 0 before layout, when the column width is 0', () => {
    expect(visibleIndex(500, 0, 0, 5)).toBe(0);
  });
});
