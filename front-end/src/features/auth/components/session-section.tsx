import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';

import { useCurrentUser } from '../api/queries';
import { useSignOut } from '../api/sign-out';

// Port of the prototype settings "Sessão" panel (design/Task List.dc.html:579-583).
export function SessionSection() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const signOut = useSignOut();

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-card px-4.5 py-4">
      <h2 className="text-lg font-medium text-text-primary">
        {t('settings.session.title')}
      </h2>
      {user && (
        <p className="text-sm text-text-secondary">
          {t('settings.session.connectedAs', {
            name: user.name,
            email: user.email,
          })}
        </p>
      )}
      <div>
        <Button variant="secondary" onPress={() => void signOut()}>
          <LogOut size={16} aria-hidden="true" />
          {t('settings.session.signOut')}
        </Button>
      </div>
    </section>
  );
}
