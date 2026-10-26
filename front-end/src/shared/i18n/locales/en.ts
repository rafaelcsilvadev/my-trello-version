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
  nav: {
    settings: 'Settings',
  },
  notFound: {
    title: 'Page not found',
    goToBoards: 'Go to My boards',
  },
  session: {
    expired: 'Your session expired. Log in again.',
  },
  auth: {
    logIn: {
      title: 'Good to see you again',
      subtitle: 'Sign in to continue.',
      submit: 'Sign in',
      submitting: 'Signing in…',
      noAccount: 'Don’t have an account?',
      createAccountLink: 'Create account',
    },
    signUp: {
      title: 'Create your account',
      subtitle: 'Keep all your boards in one place.',
      submit: 'Create account',
      submitting: 'Creating…',
      haveAccount: 'Already have an account?',
      haveAccountLink: 'Sign in',
    },
    fields: {
      name: 'Name',
      email: 'Email',
      password: 'Password',
      passwordHint: 'Use 8 to 72 characters',
      confirmPassword: 'Confirm password',
    },
    errors: {
      nameRequired: 'Enter your name',
      nameTooLong: 'Use up to 100 characters',
      emailInvalid: 'Enter a valid email',
      emailTaken: 'This email is already registered',
      passwordLength: 'Use 8 to 72 characters',
      passwordMismatch: "Passwords don't match",
      invalidCredentials: 'Invalid email or password',
      rateLimited: 'Too many attempts. Wait a minute and try again.',
    },
    accountCreated: 'Account created',
  },
  settings: {
    session: {
      title: 'Session',
      connectedAs: 'Signed in as {{name}} · {{email}}',
      signOut: 'Sign out',
    },
  },
  errors: {
    network: 'Couldn’t reach the server. Check your connection.',
    loadTitle: 'Couldn’t load',
    loadDetail: 'Check your connection and try again.',
    retry: 'Try again',
  },
  boards: {
    card: {
      createdOn: 'Created {{date}}',
      archivedOn: 'Archived {{date}}',
      menu: 'Board actions',
      pending: 'Saving…',
    },
    actions: {
      edit: 'Edit',
      archive: 'Archive',
      restore: 'Restore',
      deleteForever: 'Delete permanently',
    },
  },
  toast: {
    close: 'Close',
  },
  dates: {
    short: '{{month}} {{day}}, {{year}}',
    months: {
      jan: 'Jan',
      feb: 'Feb',
      mar: 'Mar',
      apr: 'Apr',
      may: 'May',
      jun: 'Jun',
      jul: 'Jul',
      aug: 'Aug',
      sep: 'Sep',
      oct: 'Oct',
      nov: 'Nov',
      dec: 'Dec',
    },
  },
} as const;

type DeepStringRecord<T> = {
  readonly [K in keyof T]: T[K] extends string
    ? string
    : DeepStringRecord<T[K]>;
};

// Same keys as `en`, any string values: a missing key in another locale fails tsc.
export type Translation = DeepStringRecord<typeof en>;
