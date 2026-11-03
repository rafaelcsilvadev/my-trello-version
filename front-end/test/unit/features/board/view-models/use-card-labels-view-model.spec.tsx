import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Card, Label } from '@/features/board/model/types';
import { useCardLabelsViewModel } from '@/features/board/view-models/use-card-labels-view-model';

import {
  boardId,
  cardFixture,
  labelFixture,
} from '../../../../support/fixtures/board';

const labels: Label[] = [
  labelFixture('l1', { name: 'Bug' }),
  labelFixture('l2', { name: 'Urgent' }),
  labelFixture('l3', { name: 'Docs' }),
];

function setup(card: Card | undefined, boardLabels: Label[] = labels) {
  return renderHook(() => useCardLabelsViewModel(boardId, card, boardLabels));
}

function checkedIds(result: ReturnType<typeof setup>['result']): string[] {
  return result.current.state.options
    .filter((option) => option.isChecked)
    .map((option) => option.label.id);
}

describe('useCardLabelsViewModel', () => {
  describe('opening', () => {
    it('starts closed with an empty query', () => {
      const { result } = setup(cardFixture('c1', 'list-1'));

      expect(result.current.state.isOpen).toBe(false);
      expect(result.current.state.query).toBe('');
    });

    it('opens and closes through setOpen', () => {
      const { result } = setup(cardFixture('c1', 'list-1'));

      act(() => result.current.actions.setOpen(true));
      expect(result.current.state.isOpen).toBe(true);

      act(() => result.current.actions.setOpen(false));
      expect(result.current.state.isOpen).toBe(false);
    });

    it('clears the query on close so the next open lists every label', () => {
      const { result } = setup(cardFixture('c1', 'list-1'));
      act(() => result.current.actions.setOpen(true));
      act(() => result.current.actions.setQuery('ur'));
      expect(result.current.state.options).toHaveLength(1);

      act(() => result.current.actions.setOpen(false));
      act(() => result.current.actions.setOpen(true));

      expect(result.current.state.query).toBe('');
      expect(result.current.state.options).toHaveLength(3);
    });
  });

  describe('options', () => {
    it('lists every board label in order, checked only for the card label ids', () => {
      const card = cardFixture('c1', 'list-1', { labelIds: ['l3', 'l1'] });
      const { result } = setup(card);

      expect(result.current.state.options.map((o) => o.label.id)).toEqual([
        'l1',
        'l2',
        'l3',
      ]);
      expect(checkedIds(result)).toEqual(['l1', 'l3']);
    });

    it('leaves every option unchecked when the card is not loaded', () => {
      const { result } = setup(undefined);

      expect(result.current.state.options).toHaveLength(3);
      expect(checkedIds(result)).toEqual([]);
    });

    it('is empty for a board with no labels', () => {
      const { result } = setup(cardFixture('c1', 'list-1'), []);

      expect(result.current.state.options).toEqual([]);
    });
  });

  describe('search', () => {
    it('keeps only the labels that match the query', () => {
      const card = cardFixture('c1', 'list-1', { labelIds: ['l2'] });
      const { result } = setup(card);

      act(() => result.current.actions.setQuery('ur'));

      expect(result.current.state.query).toBe('ur');
      expect(result.current.state.options).toEqual([
        { label: labels[1], isChecked: true },
      ]);
    });

    it('returns no options when nothing matches', () => {
      const { result } = setup(cardFixture('c1', 'list-1'));

      act(() => result.current.actions.setQuery('zzz'));

      expect(result.current.state.options).toEqual([]);
    });
  });
});
