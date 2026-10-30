import { describe, expect, it } from 'vitest';

import {
  cardDetailMode,
  findCardList,
} from '@/features/board/model/card-detail';
import {
  boardFixture,
  cardFixture,
  listFixture,
} from '../../../../support/fixtures/board';

const archivedAt = '2026-10-24T12:00:00.000Z';

describe('cardDetailMode', () => {
  it('is editable for an active card on an active board', () => {
    expect(cardDetailMode(cardFixture('c1', 'l1'), boardFixture())).toBe(
      'editable',
    );
  });

  it('is archivedCard for an archived card on an active board', () => {
    expect(
      cardDetailMode(cardFixture('c1', 'l1', { archivedAt }), boardFixture()),
    ).toBe('archivedCard');
  });

  it('is archivedBoard for an active card on an archived board', () => {
    expect(
      cardDetailMode(cardFixture('c1', 'l1'), boardFixture({ archivedAt })),
    ).toBe('archivedBoard');
  });

  it('is archivedBoard for an archived card on an archived board', () => {
    expect(
      cardDetailMode(
        cardFixture('c1', 'l1', { archivedAt }),
        boardFixture({ archivedAt }),
      ),
    ).toBe('archivedBoard');
  });
});

describe('findCardList', () => {
  const lists = [listFixture('active'), listFixture('gone', { archivedAt })];

  it('finds an active list', () => {
    expect(findCardList(cardFixture('c1', 'active'), lists)).toBe(lists[0]);
  });

  it('finds an archived list', () => {
    expect(findCardList(cardFixture('c1', 'gone'), lists)).toBe(lists[1]);
  });

  it('is undefined for a list of another board', () => {
    expect(
      findCardList(cardFixture('c1', 'other-board'), lists),
    ).toBeUndefined();
  });
});
