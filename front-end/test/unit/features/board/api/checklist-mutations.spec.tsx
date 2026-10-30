import { describe, expect, it } from 'vitest';

import { progressChange } from '@/features/board/api/checklist-mutations';
import { boardViewKeys } from '@/features/board/api/keys';
import type { CacheChange } from '@/features/board/api/mutations';

import { boardId, cardFixture } from '../../../../support/fixtures/board';

const card = cardFixture('c1', 'l1', { checklist: { total: 3, done: 1 } });
const other = cardFixture('c2', 'l1', { checklist: { total: 2, done: 0 } });
const archivedCard = cardFixture('c1', 'l1', {
  archivedAt: '2026-10-20T12:00:00.000Z',
  checklist: { total: 3, done: 1 },
});

function changeFor(changes: CacheChange[], key: readonly unknown[]) {
  const change = changes.find(
    (item) => JSON.stringify(item.key) === JSON.stringify(key),
  );
  if (!change) throw new Error(`no change for ${JSON.stringify(key)}`);
  return change as unknown as {
    apply: <T>(data: T) => T;
    revert: <T>(data: T) => T;
  };
}

describe('progressChange', () => {
  const cardKey = boardViewKeys.card(boardId, card.id);
  const activeKey = boardViewKeys.cards(boardId, false);
  const archivedKey = boardViewKeys.cards(boardId, true);

  it('adds the delta to the card query and to the card in both card lists', () => {
    const changes = progressChange(boardId, card.id, () => ({
      total: 1,
      done: 1,
    }));

    expect(changes.map(({ key }) => key)).toEqual([
      cardKey,
      activeKey,
      archivedKey,
    ]);
    expect(changeFor(changes, cardKey).apply(card).checklist).toEqual({
      total: 4,
      done: 2,
    });
    expect(changeFor(changes, activeKey).apply([card, other])).toEqual([
      { ...card, checklist: { total: 4, done: 2 } },
      other,
    ]);
    expect(
      changeFor(changes, archivedKey).apply([other, archivedCard]),
    ).toEqual([other, { ...archivedCard, checklist: { total: 4, done: 2 } }]);
  });

  it('subtracts the applied delta on revert', () => {
    const changes = progressChange(boardId, card.id, () => ({
      total: 0,
      done: -1,
    }));
    const detail = changeFor(changes, cardKey);
    const active = changeFor(changes, activeKey);

    const applied = detail.apply(card);
    const appliedList = active.apply([card, other]);

    expect(applied.checklist).toEqual({ total: 3, done: 0 });
    expect(detail.revert(applied).checklist).toEqual({ total: 3, done: 1 });
    expect(active.revert(appliedList)).toEqual([card, other]);
  });

  it('keeps the other change when two overlapping deltas revert out of order', () => {
    const first = changeFor(
      progressChange(boardId, card.id, () => ({ total: 0, done: 1 })),
      cardKey,
    );
    const second = changeFor(
      progressChange(boardId, card.id, () => ({ total: 1, done: 0 })),
      cardKey,
    );

    const both = second.apply(first.apply(card));
    const firstReverted = first.revert(both);

    expect(firstReverted.checklist).toEqual({ total: 4, done: 1 });
    expect(second.revert(firstReverted).checklist).toEqual({
      total: 3,
      done: 1,
    });
  });

  it('applies and reverts the delta read when the change applies', () => {
    let delta = { total: 5, done: 5 };
    const detail = changeFor(
      progressChange(boardId, card.id, () => delta),
      cardKey,
    );

    delta = { total: -1, done: -1 };
    const applied = detail.apply(card);
    delta = { total: 7, done: 7 };

    expect(applied.checklist).toEqual({ total: 2, done: 0 });
    expect(detail.revert(applied).checklist).toEqual({ total: 3, done: 1 });
  });

  it('reverts nothing in a list that did not hold the card when it applied', () => {
    const active = changeFor(
      progressChange(boardId, card.id, () => ({ total: 1, done: 1 })),
      activeKey,
    );

    expect(active.apply([other])).toEqual([other]);
    expect(active.revert([card, other])).toEqual([card, other]);
  });
});
