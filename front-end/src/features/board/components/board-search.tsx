import { Search, X } from 'lucide-react';
import { type KeyboardEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useShortcut } from '@/shared/keyboard/use-shortcut';
import { Button } from '@/shared/ui/button';

type BoardSearchProps = {
  value: string;
  isShortcutEnabled: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
};

// Port of the prototype search field (design/Task List.dc.html:324-329).
export function BoardSearch({
  value,
  isShortcutEnabled,
  onChange,
  onClear,
}: BoardSearchProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  // FE-AD-011 guards live in the hook (FBF-07, FBF-08).
  useShortcut('/', () => inputRef.current?.focus(), {
    enabled: isShortcutEnabled,
  });

  // Stops only the Esc it handles, so the board Esc handler does not also run (FBF-06).
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Escape' || value === '') return;
    event.stopPropagation();
    onClear();
  }

  return (
    <div className="flex h-9 w-full md:w-65 items-center gap-2 rounded-sm border border-border-subtle bg-surface-card pr-1.5 pl-2.5 text-text-tertiary shadow-input focus-within:border-border-focus focus-within:shadow-focus">
      <Search size={16} aria-hidden />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('board.toolbar.search')}
        aria-label={t('board.toolbar.search')}
        className="min-w-0 flex-1 bg-transparent text-md text-text-primary outline-0 placeholder:text-text-tertiary"
      />
      {value !== '' && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('board.toolbar.clearSearch')}
          onPress={onClear}
        >
          <X size={16} aria-hidden />
        </Button>
      )}
      <span
        aria-hidden
        className="hidden md:inline rounded-xs border border-border-subtle px-1.5 py-px text-2xs text-text-tertiary"
      >
        /
      </span>
    </div>
  );
}
