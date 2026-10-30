import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/shared/api/api-error';
import { saveFailureKind } from '@/shared/api/save-failure';
import { useToast } from '@/shared/ui/toast/use-toast';

// `retryMessage` replaces the generic text only where the change can be resent;
// `conflictMessage` replaces it only on a conflict, still offering a reload.
type NotifyOptions = { retryMessage?: string; conflictMessage?: string };

// The cache rollback is done by the mutation hooks; this only tells the user.
// `reload` refetches the screen's data after a conflict or a missing item.
export function useSaveFailureNotifier(reload: () => void) {
  const { t } = useTranslation();
  const toast = useToast();

  function notify(err: ApiError, retry: () => void, options?: NotifyOptions) {
    switch (saveFailureKind(err)) {
      case 'sessionExpired':
        return;
      case 'conflict':
        toast.show({
          message: options?.conflictMessage ?? t('errors.conflict'),
          action: { label: t('errors.reload'), onClick: reload },
        });
        return;
      case 'notFound':
        toast.show({ message: t('errors.saveFail') });
        reload();
        return;
      default:
        toast.show({
          message: options?.retryMessage ?? t('errors.saveFail'),
          action: { label: t('errors.retry'), onClick: retry },
        });
    }
  }

  // `mutateAsync`, not `mutate` with callbacks: those only run for the latest call,
  // so a second change started meanwhile would swallow the first one's toast.
  // Retries close over `variables`, not screen state, so they survive a screen change.
  // A `null` success message saves silently.
  function runChange<TVariables>(
    mutateAsync: (variables: TVariables) => Promise<unknown>,
    variables: TVariables,
    successMessage: string | null,
    options?: NotifyOptions,
  ) {
    mutateAsync(variables).then(
      () => {
        if (successMessage !== null) {
          toast.show({ message: successMessage });
        }
      },
      (err: ApiError) =>
        notify(
          err,
          () => runChange(mutateAsync, variables, successMessage, options),
          options,
        ),
    );
  }

  return { notify, runChange };
}
