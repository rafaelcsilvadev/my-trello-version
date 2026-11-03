import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LABEL_COLOR,
  isLabelNameTaken,
  LABEL_COLORS,
  searchLabels,
  validateLabelName,
  withLabelId,
  withoutLabelId,
} from '@/features/board/model/labels';
import { ApiError } from '@/shared/api/api-error';

import { labelFixture } from '../../../../support/fixtures/board';

const urgent = labelFixture('l1', { name: 'Urgent' });
const design = labelFixture('l2', { name: 'Ação rápida' });
const backlog = labelFixture('l3', { name: 'Backlog' });
const labels = [urgent, design, backlog];

describe('LABEL_COLORS', () => {
  it('lists the 10 colors in doc §8 order', () => {
    expect(LABEL_COLORS).toEqual([
      'purple',
      'blue',
      'sky',
      'green',
      'lime',
      'yellow',
      'orange',
      'red',
      'pink',
      'black',
    ]);
  });

  it('defaults to blue', () => {
    expect(DEFAULT_LABEL_COLOR).toBe('blue');
  });
});

describe('searchLabels', () => {
  it.each([
    ['empty', ''],
    ['blank', '   '],
  ])('returns every label in order when the query is %s', (_case, query) => {
    expect(searchLabels(labels, query)).toEqual([urgent, design, backlog]);
  });

  it('matches a part of the name', () => {
    expect(searchLabels(labels, 'ur')).toEqual([urgent]);
  });

  it('ignores case and surrounding spaces', () => {
    expect(searchLabels(labels, '  URG ')).toEqual([urgent]);
  });

  it('ignores accents in the query and in the name', () => {
    expect(searchLabels(labels, 'acao')).toEqual([design]);
    expect(searchLabels(labels, 'RÁPIDA')).toEqual([design]);
  });

  it('keeps board label order among the matches', () => {
    expect(searchLabels(labels, 'g')).toEqual([urgent, backlog]);
    expect(searchLabels([backlog, urgent], 'g')).toEqual([backlog, urgent]);
  });

  it('returns no label when nothing matches', () => {
    expect(searchLabels(labels, 'zzz')).toEqual([]);
  });
});

describe('withLabelId', () => {
  it('puts the middle label between the other two', () => {
    expect(withLabelId(['l1', 'l3'], 'l2', labels)).toEqual(['l1', 'l2', 'l3']);
  });

  it('sorts the ids by board label order', () => {
    expect(withLabelId(['l3'], 'l1', labels)).toEqual(['l1', 'l3']);
  });

  it('never adds a duplicate', () => {
    expect(withLabelId(['l1', 'l2'], 'l2', labels)).toEqual(['l1', 'l2']);
  });

  it('keeps ids missing from the board list at the end in their order', () => {
    expect(withLabelId(['gone-b', 'l3', 'gone-a'], 'l1', labels)).toEqual([
      'l1',
      'l3',
      'gone-b',
      'gone-a',
    ]);
  });

  it('does not mutate its input', () => {
    const labelIds = ['l3', 'l1'];
    withLabelId(labelIds, 'l2', labels);
    expect(labelIds).toEqual(['l3', 'l1']);
  });
});

describe('withoutLabelId', () => {
  it('removes only that id', () => {
    expect(withoutLabelId(['l1', 'l2', 'l3'], 'l2')).toEqual(['l1', 'l3']);
  });
});

describe('isLabelNameTaken', () => {
  const problem = (status: number, type: string) =>
    new ApiError({ status, type, title: 'Problem', detail: '' });

  it('is true for a 409 label-name-taken problem', () => {
    expect(isLabelNameTaken(problem(409, '/problems/label-name-taken'))).toBe(
      true,
    );
  });

  it('accepts an absolute type URI ending with the problem path', () => {
    expect(
      isLabelNameTaken(
        problem(409, 'https://api.example.test/problems/label-name-taken'),
      ),
    ).toBe(true);
  });

  it('is false for a 409 board-archived problem', () => {
    expect(isLabelNameTaken(problem(409, '/problems/board-archived'))).toBe(
      false,
    );
  });

  it('is false for a 400 with the same type', () => {
    expect(isLabelNameTaken(problem(400, '/problems/label-name-taken'))).toBe(
      false,
    );
  });
});

describe('validateLabelName', () => {
  const bug = labelFixture('l4', { name: 'Bug' });
  const board = [urgent, bug];

  it.each(['', '   '])('requires a name (%j)', (raw) => {
    expect(validateLabelName(raw, board)).toBe('labelNameRequired');
  });

  it('accepts 50 characters', () => {
    expect(validateLabelName('a'.repeat(50), board)).toBeNull();
  });

  it('accepts 50 characters with outer spaces', () => {
    expect(validateLabelName(`  ${'a'.repeat(50)}  `, board)).toBeNull();
  });

  it('rejects 51 characters', () => {
    expect(validateLabelName('a'.repeat(51), board)).toBe('labelNameTooLong');
  });

  it.each(['bug', ' BUG '])(
    'rejects a name taken on the board ignoring case (%j)',
    (raw) => {
      expect(validateLabelName(raw, board)).toBe('labelNameTaken');
    },
  );

  it('accepts a name that only contains a board label name', () => {
    expect(validateLabelName('Bugs', board)).toBeNull();
  });
});
