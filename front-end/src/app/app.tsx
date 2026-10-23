import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { RouterProvider } from 'react-router';

import { ApiProvider } from '@/shared/api/api-context';
import { LanguageController } from '@/shared/i18n/language-controller';
import { SessionProvider } from '@/shared/session/session-context';
import { ThemeController } from '@/shared/theme/theme-controller';
import { ToastProvider } from '@/shared/ui/toast/toast-provider';

import type { AppServices } from './app-services';

export function App({ services }: { services: AppServices }) {
  const { session, preferences, queryClient, i18n, router, api } = services;

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ApiProvider client={api}>
          <SessionProvider store={session}>
            <ToastProvider>
              <ThemeController store={preferences} />
              <LanguageController store={preferences} i18n={i18n} />
              <div className="min-h-screen bg-surface-page font-body text-text-primary">
                <RouterProvider router={router} />
              </div>
            </ToastProvider>
          </SessionProvider>
        </ApiProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
