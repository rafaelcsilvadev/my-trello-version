export const en = {
  routes: {
    login: 'Sign in',
    signup: 'Create account',
    boards: 'My boards',
    board: 'Board',
    card: 'Card',
    labels: 'Labels',
    settings: 'Settings',
  },
  notFound: {
    title: 'Page not found',
    goToBoards: 'Go to My boards',
  },
  session: {
    expired: 'Your session expired. Log in again.',
  },
  errors: {
    network: 'Couldn’t reach the server. Check your connection.',
    loadTitle: 'Couldn’t load',
    loadDetail: 'Check your connection and try again.',
    retry: 'Try again',
  },
  toast: {
    close: 'Close',
  },
} as const;

type DeepStringRecord<T> = {
  readonly [K in keyof T]: T[K] extends string
    ? string
    : DeepStringRecord<T[K]>;
};

// Same keys as `en`, any string values: a missing key in another locale fails tsc.
export type Translation = DeepStringRecord<typeof en>;
