import { describe, expect, it } from 'vitest';

import {
  countLabelUsage,
  labelChanges,
  usageText,
  withoutLabel,
} from '@/features/board/model/label-usage';

import { cardFixture, labelFixture } from '../../../../support/fixtures/board';

describe('countLabelUsage', () => {
  const c1 = cardFixture('c1', 'x', { labelIds: ['l1', 'l2'] });
  const c2 = cardFixture('c2', 'x', { labelIds: ['l1'] });
  const c3 = cardFixture('c3', 'y', { labelIds: ['l1', 'l3'] });

  it('counts each label once per card across all sources', () => {
    const counts = countLabelUsage([[c1, c2], [c3]]);
    expect(counts.get('l1')).toBe(3);
    expect(counts.get('l2')).toBe(1);
    expect(counts.get('l3')).toBe(1);
  });

  it('has no entry for a label on no card', () => {
    const counts = countLabelUsage([[c1]]);
    expect(counts.has('l9')).toBe(false);
  });

  it('returns an empty map for no cards', () => {
    expect(countLabelUsage([]).size).toBe(0);
    expect(countLabelUsage([[], []]).size).toBe(0);
  });

  it('does not mutate its input', () => {
    const sources = [[c1, c2], [c3]];
    const snapshot = structuredClone(sources);
    countLabelUsage(sources);
    expect(sources).toEqual(snapshot);
  });
});

describe('usageText', () => {
  it('picks the unused form for 0', () => {
    expect(usageText(0)).toEqual({ key: 'unused', count: 0 });
  });

  it('picks the one form for 1', () => {
    expect(usageText(1)).toEqual({ key: 'one', count: 1 });
  });

  it.each([2, 10])('picks the many form with the count for %i', (count) => {
    expect(usageText(count)).toEqual({ key: 'many', count });
  });
});

describe('labelChanges', () => {
  const label = labelFixture('l1', { name: 'Defect', color: 'red' });

  it('returns null when name and color are the same', () => {
    expect(labelChanges(label, 'Defect', 'red')).toBeNull();
  });

  it('returns only the name when only the name changed', () => {
    expect(labelChanges(label, 'Bug', 'red')).toEqual({ name: 'Bug' });
  });

  it('returns only the color when only the color changed', () => {
    expect(labelChanges(label, 'Defect', 'blue')).toEqual({ color: 'blue' });
  });

  it('returns both when both changed', () => {
    expect(labelChanges(label, 'Bug', 'blue')).toEqual({
      name: 'Bug',
      color: 'blue',
    });
  });

  it('trims the name', () => {
    expect(labelChanges(label, '  Bug  ', 'red')).toEqual({ name: 'Bug' });
  });

  it('treats a name equal to the current one after trimming as unchanged', () => {
    expect(labelChanges(label, '  Defect  ', 'red')).toBeNull();
    expect(labelChanges(label, '  Defect  ', 'blue')).toEqual({
      color: 'blue',
    });
  });
});

describe('withoutLabel', () => {
  const a = labelFixture('l1');
  const b = labelFixture('l2');
  const c = labelFixture('l3');

  it('removes only that id', () => {
    expect(withoutLabel([a, b, c], 'l2')).toEqual([a, c]);
  });

  it('keeps every label when the id is absent', () => {
    expect(withoutLabel([a, b], 'l9')).toEqual([a, b]);
  });
});
