// A column counts as in view once it fills more than half the scroller.
export function visibleIndex(
  scrollLeft: number,
  columnWidth: number,
  gap: number,
  count: number,
): number {
  const stride = columnWidth + gap;
  if (count <= 0 || stride <= 0) return 0;

  const index = Math.round(scrollLeft / stride);
  return Math.min(Math.max(index, 0), count - 1);
}
