import { Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Port of the prototype keyboard help line (design/Task List.dc.html:522).
// The phone layout has no keyboard move hint, so it shows from md up.
export function KeyboardHelp() {
  const { t } = useTranslation();

  return (
    <div className="hidden md:flex items-center gap-1.5 text-xs text-text-tertiary">
      <Keyboard size={14} aria-hidden="true" />
      <span>{t('board.move.keyboardHelp')}</span>
    </div>
  );
}
