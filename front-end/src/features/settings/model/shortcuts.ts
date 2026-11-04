export type ShortcutRow = {
  id: 'new' | 'search' | 'escape' | 'move' | 'help';
  keyLabel: string | { i18nKey: 'settings.shortcuts.keys.space' };
};

// One source for the settings panel and the shortcuts dialog.
export const SHORTCUTS: readonly ShortcutRow[] = [
  { id: 'new', keyLabel: 'N' },
  { id: 'search', keyLabel: '/' },
  { id: 'escape', keyLabel: 'Esc' },
  { id: 'move', keyLabel: { i18nKey: 'settings.shortcuts.keys.space' } },
  { id: 'help', keyLabel: '?' },
];
