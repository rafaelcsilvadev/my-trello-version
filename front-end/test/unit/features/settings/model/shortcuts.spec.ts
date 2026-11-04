import { describe, expect, it } from 'vitest';

import { SHORTCUTS } from '@/features/settings/model/shortcuts';

describe('SHORTCUTS', () => {
  it('lists new, search, escape, move and help in that order', () => {
    expect(SHORTCUTS.map((row) => row.id)).toEqual([
      'new',
      'search',
      'escape',
      'move',
      'help',
    ]);
  });

  it('uses the literal keys N, /, Esc, ? and a translated key for move', () => {
    expect(SHORTCUTS.map((row) => row.keyLabel)).toEqual([
      'N',
      '/',
      'Esc',
      { i18nKey: 'settings.shortcuts.keys.space' },
      '?',
    ]);
  });
});
