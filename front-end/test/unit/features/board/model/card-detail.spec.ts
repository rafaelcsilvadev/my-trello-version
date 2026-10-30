import { describe, expect, it } from 'vitest';

import {
  cardDetailMode,
  descriptionBody,
  findCardList,
  isDescriptionTooLong,
  isDirty,
  nextPosition,
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

describe('isDescriptionTooLong', () => {
  it.each([4999, 5000])('allows %i characters', (length) => {
    expect(isDescriptionTooLong('a'.repeat(length))).toBe(false);
  });

  it('is too long at 5001 characters', () => {
    expect(isDescriptionTooLong('a'.repeat(5001))).toBe(true);
  });
});

describe('descriptionBody', () => {
  it('is null for an empty draft', () => {
    expect(descriptionBody('')).toBeNull();
  });

  it('keeps a spaces-only draft as is', () => {
    expect(descriptionBody('   ')).toBe('   ');
  });

  it('keeps the draft untrimmed', () => {
    expect(descriptionBody('  notes \n')).toBe('  notes \n');
  });
});

describe('isDirty', () => {
  const card = cardFixture('c1', 'l1', {
    title: 'Plan sprint',
    description: 'Notes',
  });

  it('is not dirty with null drafts', () => {
    expect(isDirty(card, { title: null, description: null })).toBe(false);
  });

  it('is dirty when the trimmed title draft differs', () => {
    expect(isDirty(card, { title: 'Plan release', description: null })).toBe(
      true,
    );
  });

  it('is not dirty when the title draft differs only by outer spaces', () => {
    expect(isDirty(card, { title: '  Plan sprint  ', description: null })).toBe(
      false,
    );
  });

  it('is dirty when the description draft differs', () => {
    expect(isDirty(card, { title: null, description: 'Notes ' })).toBe(true);
  });

  it('is not dirty when the description draft equals the saved one', () => {
    expect(isDirty(card, { title: null, description: 'Notes' })).toBe(false);
  });

  it('treats a null description as an empty draft', () => {
    const blank = cardFixture('c2', 'l1');

    expect(isDirty(blank, { title: null, description: '' })).toBe(false);
    expect(isDirty(blank, { title: null, description: ' ' })).toBe(true);
  });
});

describe('nextPosition', () => {
  it('is the max active position of the column plus one', () => {
    const cards = [
      cardFixture('a', 'l1', { position: 2 }),
      cardFixture('b', 'l1', { position: 5 }),
      cardFixture('c', 'l2', { position: 9 }),
      cardFixture('d', 'l1', { position: null, archivedAt }),
    ];

    expect(nextPosition(cards, 'l1')).toBe(6);
  });

  it('is 0 for an empty column', () => {
    expect(nextPosition([cardFixture('c', 'l2', { position: 3 })], 'l1')).toBe(
      0,
    );
  });
});
